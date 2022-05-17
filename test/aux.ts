const { assert } = require("chai");
export const assertIsRejected = (
  promise: Promise<any>,
  error_match: RegExp,
  message: string
) => {
  let passed = false;
  return promise
    .then(() => {
      passed = true;
      return assert.fail();
    })
    .catch((error) => {
      if (passed)
        return assert.fail(message || "Expected promise to be rejected");
      if (error_match) {
        if (typeof error_match === "string")
          return assert.equal(error_match, error.message, message);
        if (error_match instanceof RegExp)
          return (
            error.message.match(error_match) ||
            assert.fail(
              error.message,
              error_match.toString(),
              `'${
                error.message
              }' does not match ${error_match.toString()}: ${message}`
            )
          );
        return assert.instanceOf(error, error_match, message);
      }
    });
};
