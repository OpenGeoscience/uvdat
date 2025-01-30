// .eslintrc.js
module.exports = {
    "extends": [
        "plugin:vue/base",
    ],
    "parser": "vue-eslint-parser",
    "parserOptions": {
        "parser": "@typescript-eslint/parser",
        "extraFileExtensions": [".vue"],
        "ecmaVersion": 2021
    },
    "plugins": [
        "vue",
        "@typescript-eslint"
    ],
    rules: {
      'vue/script-setup-uses-vars': 'error',
    }
}
