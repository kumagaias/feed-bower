version: 1
frontend:
  phases:
    preBuild:
      commands:
        - nvm use ${node_version}
        - npm ci
    build:
      commands:
        - ${build_command}
  artifacts:
    baseDirectory: ${output_directory}
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
      - .next/cache/**/*
