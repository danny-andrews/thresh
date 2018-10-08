export default {
  files: [
    'packages/*/src/**/__tests__/**/*.js',
    '!packages/thresh-artifact-store-circleci/**'
  ],
  require: ['@babel/register'],
  failWithoutAssertions: false
};
