-- ============================================================
-- Inventory Reservation API — Database Migration
-- Run this entire file in the Supabase SQL Editor.
-- ============================================================

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS items (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT        NOT NULL,
  total_quantity INTEGER     NOT NULL CHECK (total_quantity >= 0),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reservations (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id       UUID        NOT NULL,
  customer_id   TEXT        NOT NULL,
  quantity      INTEGER     NOT NULL CHECK (quantity > 0),
  status        TEXT        NOT NULL DEFAULT 'PENDING'
                            CHECK (status IN ('PENDING', 'CONFIRMED', 'CANCELLED', 'EXPIRED')),
  expires_at    TIMESTAMPTZ NOT NULL,
  confirmed_at  TIMESTAMPTZ,
  cancelled_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_reservations_item_id FOREIGN KEY (item_id) REFERENCES items(id)
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_reservations_item_id    ON reservations(item_id);
CREATE INDEX IF NOT EXISTS idx_reservations_status     ON reservations(status);
CREATE INDEX IF NOT EXISTS idx_reservations_expires_at ON reservations(expires_at);

-- ============================================================
-- POSTGRESQL FUNCTIONS
-- All transactional operations use SELECT ... FOR UPDATE to
-- prevent race conditions. Called via supabase.rpc().
-- ============================================================

-- ------------------------------------------------------------
-- create_reservation
-- Locks the item row, checks available quantity, and inserts
-- a PENDING reservation. Raises an exception if stock is
-- insufficient so the caller receives a structured error.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION create_reservation(
  p_item_id     UUID,
  p_customer_id TEXT,
  p_quantity    INTEGER
)
RETURNS SETOF reservations
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_item          items%ROWTYPE;
  v_confirmed_qty INTEGER;
  v_held_qty      INTEGER;
  v_available     INTEGER;
  v_new_reservation reservations%ROWTYPE;
BEGIN
  -- Lock the item row to serialise concurrent reservation attempts
  SELECT * INTO v_item
  FROM items
  WHERE id = p_item_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'item_not_found' USING HINT = 'item_id does not exist';
  END IF;

  -- Compute how much is already spoken for
  SELECT
    COALESCE(SUM(quantity) FILTER (WHERE status = 'CONFIRMED'), 0),
    COALESCE(SUM(quantity) FILTER (WHERE status = 'PENDING' AND expires_at > NOW()), 0)
  INTO v_confirmed_qty, v_held_qty
  FROM reservations
  WHERE item_id = p_item_id;

  v_available := v_item.total_quantity - v_confirmed_qty - v_held_qty;

  IF p_quantity > v_available THEN
    RAISE EXCEPTION 'insufficient_inventory'
      USING HINT = format('requested %s, available %s', p_quantity, v_available);
  END IF;

  INSERT INTO reservations (item_id, customer_id, quantity, status, expires_at)
  VALUES (p_item_id, p_customer_id, p_quantity, 'PENDING', NOW() + INTERVAL '10 minutes')
  RETURNING * INTO v_new_reservation;

  RETURN NEXT v_new_reservation;
END;
$$;

-- ------------------------------------------------------------
-- confirm_reservation
-- Locks the reservation row, then transitions PENDING →
-- CONFIRMED. Idempotent: returns current state if already
-- CONFIRMED. Raises an exception for CANCELLED / EXPIRED.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION confirm_reservation(
  p_reservation_id UUID
)
RETURNS SETOF reservations
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_reservation reservations%ROWTYPE;
BEGIN
  SELECT * INTO v_reservation
  FROM reservations
  WHERE id = p_reservation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'reservation_not_found' USING HINT = 'reservation_id does not exist';
  END IF;

  -- Idempotent: already confirmed → return as-is
  IF v_reservation.status = 'CONFIRMED' THEN
    RETURN NEXT v_reservation;
    RETURN;
  END IF;

  IF v_reservation.status = 'CANCELLED' THEN
    RAISE EXCEPTION 'reservation_cancelled'
      USING HINT = 'Cannot confirm a cancelled reservation';
  END IF;

  IF v_reservation.status = 'EXPIRED' OR v_reservation.expires_at <= NOW() THEN
    RAISE EXCEPTION 'reservation_expired'
      USING HINT = 'Cannot confirm an expired reservation';
  END IF;

  UPDATE reservations
  SET status = 'CONFIRMED', confirmed_at = NOW()
  WHERE id = p_reservation_id
  RETURNING * INTO v_reservation;

  RETURN NEXT v_reservation;
END;
$$;

-- ------------------------------------------------------------
-- cancel_reservation
-- Locks the reservation row, then transitions PENDING →
-- CANCELLED. Idempotent: returns current state if already
-- CANCELLED. Raises an exception for CONFIRMED or EXPIRED.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION cancel_reservation(
  p_reservation_id UUID
)
RETURNS SETOF reservations
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_reservation reservations%ROWTYPE;
BEGIN
  SELECT * INTO v_reservation
  FROM reservations
  WHERE id = p_reservation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'reservation_not_found' USING HINT = 'reservation_id does not exist';
  END IF;

  -- Idempotent: already cancelled → return as-is
  IF v_reservation.status = 'CANCELLED' THEN
    RETURN NEXT v_reservation;
    RETURN;
  END IF;

  IF v_reservation.status = 'EXPIRED' OR v_reservation.expires_at <= NOW() THEN
    RAISE EXCEPTION 'reservation_expired'
      USING HINT = 'Cannot cancel an expired reservation';
  END IF;

  IF v_reservation.status = 'CONFIRMED' THEN
    RAISE EXCEPTION 'reservation_confirmed'
      USING HINT = 'Cannot cancel a confirmed reservation';
  END IF;

  UPDATE reservations
  SET status = 'CANCELLED', cancelled_at = NOW()
  WHERE id = p_reservation_id
  RETURNING * INTO v_reservation;

  RETURN NEXT v_reservation;
END;
$$;

-- ------------------------------------------------------------
-- expire_reservations
-- Bulk-marks all PENDING reservations past their expiry time
-- as EXPIRED. Returns the count of affected rows.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION expire_reservations()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  WITH expired AS (
    UPDATE reservations
    SET status = 'EXPIRED'
    WHERE status = 'PENDING' AND expires_at < NOW()
    RETURNING id
  )
  SELECT COUNT(*) INTO v_count FROM expired;

  RETURN v_count;
END;
$$;

-- ------------------------------------------------------------
-- get_item_status
-- Returns item info with pre-computed quantity buckets so the
-- API layer only needs a single rpc() call.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_item_status(p_item_id UUID)
RETURNS TABLE (
  id                 UUID,
  name               TEXT,
  total_quantity     INTEGER,
  confirmed_quantity BIGINT,
  held_quantity      BIGINT,
  available_quantity BIGINT,
  created_at         TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.id,
    i.name,
    i.total_quantity,
    COALESCE(SUM(r.quantity) FILTER (WHERE r.status = 'CONFIRMED'), 0)                              AS confirmed_quantity,
    COALESCE(SUM(r.quantity) FILTER (WHERE r.status = 'PENDING' AND r.expires_at > NOW()), 0)      AS held_quantity,
    i.total_quantity
      - COALESCE(SUM(r.quantity) FILTER (WHERE r.status = 'CONFIRMED'), 0)
      - COALESCE(SUM(r.quantity) FILTER (WHERE r.status = 'PENDING' AND r.expires_at > NOW()), 0)  AS available_quantity,
    i.created_at
  FROM items i
  LEFT JOIN reservations r ON r.item_id = i.id
  WHERE i.id = p_item_id
  GROUP BY i.id;
END;
$$;

-- ============================================================
-- GRANTS
-- Required for PostgREST (used by Supabase JS SDK) to access
-- tables and call functions as the service_role.
-- ============================================================

GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
