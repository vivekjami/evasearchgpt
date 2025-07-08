/** @type {import("eslint").Linter.Config} */
const config = {
  extends: ["next/core-web-vitals"],
  rules: {
    "@typescript-eslint/no-explicit-any": "warn",
    "react/no-unescaped-entities": "warn",
  }
};

module.exports = config;
