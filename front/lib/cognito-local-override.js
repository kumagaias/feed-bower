// AWS SDK override for Cognito Local
const { CognitoIdentityProviderClient } = require('@aws-sdk/client-cognito-identity-provider');

// Override the default client to use Cognito Local endpoint
const originalClient = CognitoIdentityProviderClient;

function CognitoLocalClient(config) {
  const localConfig = {
    ...config,
    endpoint: 'http://localhost:9229',
    region: 'ap-northeast-1',
    credentials: {
      accessKeyId: 'test',
      secretAccessKey: 'test',
    },
  };
  return new originalClient(localConfig);
}

// Copy all static methods and properties
Object.setPrototypeOf(CognitoLocalClient, originalClient);
Object.assign(CognitoLocalClient, originalClient);

module.exports = {
  CognitoIdentityProviderClient: CognitoLocalClient,
  ...require('@aws-sdk/client-cognito-identity-provider'),
};