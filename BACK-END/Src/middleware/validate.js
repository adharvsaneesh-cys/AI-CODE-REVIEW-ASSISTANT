const validate = (schema) => {
  return (request, response, next) => {
    const result = schema.safeParse({
      body: request.body,
      params: request.params,
      query: request.query,
    });

    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join(".").replace("body.", ""),
        message: issue.message,
      }));

      return response.status(400).json({
        success: false,
        message: "Validation failed",
        errors,
      });
    }

    if (result.data.body) {
      request.body = result.data.body;
    }

    if (result.data.params) {
      request.params = result.data.params;
    }

    if (result.data.query) {
      request.query = result.data.query;
    }

    return next();
  };
};

module.exports = validate;