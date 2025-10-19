version: 1
frontend:
  phases:
    preBuild:
      commands:
        - cd front
        - nvm use ${node_version}
        - npm ci
    build:
      commands:
        - ${build_command}
  artifacts:
    baseDirectory: front/${output_directory}
    files:
      - '**/*'
  cache:
    paths:
      - front/node_modules/**/*
      - front/.next/cache/**/*
