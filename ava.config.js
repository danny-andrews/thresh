export default {
  files: [
    'packages/*/src/**/__tests__/**/*.js',
    '!packages/thresh/src/shared/**'
  ],
  require: ['@babel/register'],
  failWithoutAssertions: false
};
