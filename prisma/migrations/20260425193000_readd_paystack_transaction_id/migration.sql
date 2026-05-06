SET @payment_paystack_transaction_id_column_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'Payment'
    AND COLUMN_NAME = 'paystackTransactionId'
);

SET @payment_paystack_transaction_id_column_sql = IF(
  @payment_paystack_transaction_id_column_exists = 0,
  'ALTER TABLE `Payment` ADD COLUMN `paystackTransactionId` VARCHAR(191) NULL',
  'SELECT 1'
);

PREPARE payment_paystack_transaction_id_column_stmt FROM @payment_paystack_transaction_id_column_sql;
EXECUTE payment_paystack_transaction_id_column_stmt;
DEALLOCATE PREPARE payment_paystack_transaction_id_column_stmt;

SET @payment_paystack_transaction_id_index_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'Payment'
    AND INDEX_NAME = 'Payment_paystackTransactionId_key'
);

SET @payment_paystack_transaction_id_index_sql = IF(
  @payment_paystack_transaction_id_index_exists = 0,
  'CREATE UNIQUE INDEX `Payment_paystackTransactionId_key` ON `Payment`(`paystackTransactionId`)',
  'SELECT 1'
);

PREPARE payment_paystack_transaction_id_index_stmt FROM @payment_paystack_transaction_id_index_sql;
EXECUTE payment_paystack_transaction_id_index_stmt;
DEALLOCATE PREPARE payment_paystack_transaction_id_index_stmt;
