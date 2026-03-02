SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name IN ('astra_transactions', 'astra_balances', 'posts')
ORDER BY table_name, ordinal_position;
