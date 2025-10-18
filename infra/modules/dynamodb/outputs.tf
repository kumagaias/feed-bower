output "table_id" {
  description = "DynamoDB テーブル ID"
  value       = aws_dynamodb_table.table.id
}

output "table_arn" {
  description = "DynamoDB テーブル ARN"
  value       = aws_dynamodb_table.table.arn
}

output "table_name" {
  description = "DynamoDB テーブル名"
  value       = aws_dynamodb_table.table.name
}

output "stream_arn" {
  description = "DynamoDB Streams ARN"
  value       = var.stream_enabled ? aws_dynamodb_table.table.stream_arn : null
}

output "stream_label" {
  description = "DynamoDB Streams ラベル"
  value       = var.stream_enabled ? aws_dynamodb_table.table.stream_label : null
}
