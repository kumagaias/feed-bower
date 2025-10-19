exports.handler = async (event) => {
  // 自動的にユーザーを確認済みにする
  event.response.autoConfirmUser = true;
  
  // メールも自動的に確認済みにする
  if (event.request.userAttributes.hasOwnProperty('email')) {
    event.response.autoVerifyEmail = true;
  }
  
  return event;
};
