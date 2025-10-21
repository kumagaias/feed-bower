FROM public.ecr.aws/lambda/nodejs:20

# Lambda関数コードをコピー
COPY index.js ${LAMBDA_TASK_ROOT}/
COPY feed-database.json ${LAMBDA_TASK_ROOT}/
COPY package.json ${LAMBDA_TASK_ROOT}/

# 依存関係をインストール（現在は不要だが、将来のため）
# RUN npm install --production

# ハンドラーを設定  
# For AWS Lambda Node.js runtime, CMD should be the handler in format: file.function
CMD ["index.handler"]
