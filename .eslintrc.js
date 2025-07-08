module.exports = {
  extends: ['next/core-web-vitals'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
  },
  overrides: [
    {
      // Disable the no-explicit-any rule for specific files
      files: ['src/types/analytics.ts', 'src/utils/performance-monitor.ts'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
      },
    },
  ],
};
