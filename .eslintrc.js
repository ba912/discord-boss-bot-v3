module.exports = {
  env: {
    node: true,
    es2022: true,
  },
  extends: [
    'eslint:recommended'
  ],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  rules: {
    // 코드 스타일
    'indent': ['error', 2],
    'quotes': ['error', 'single'],
    'semi': ['error', 'always'],
    'comma-dangle': ['error', 'always-multiline'],
    'no-trailing-spaces': 'error',
    'eol-last': 'error',
    
    // 모던 JS 패턴
    'prefer-const': 'error',
    'no-var': 'error',
    'prefer-arrow-functions': 'off',
    'arrow-spacing': 'error',
    
    // 에러 방지
    'no-console': 'off', // 봇 개발시 console.log 필요
    'no-unused-vars': ['error', { 'argsIgnorePattern': '^_' }],
    'no-undef': 'error',
    
    // Discord.js 관련
    'no-process-exit': 'error',
  },
};