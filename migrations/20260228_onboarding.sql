-- ============================================================
-- A-LAB: ONBOARDING UPDATES (300 Astra & Setup Flag)
-- ============================================================

-- 1. Update the resident creation trigger to set default links for setup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.residents (user_id, full_name, role, status, links)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Anonymous Resident'),
    'Resident',
    'open',
    '{"setup_complete": false, "visibility": "hidden"}'::jsonb
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Update the Astra wallet creation trigger to grant 300 tokens and log the transaction
CREATE OR REPLACE FUNCTION public.handle_new_resident_wallet()
RETURNS trigger AS $$
BEGIN
  -- Insert 300 tokens
  INSERT INTO public.astra_wallets (resident_id, balance)
  VALUES (NEW.id, 300);

  -- Log the minting transaction
  INSERT INTO public.astra_transactions (sender_id, receiver_id, amount, tx_type, description)
  VALUES (NULL, NEW.id, 300, 'mint', 'Welcome bonus: Onboarding Grant');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
