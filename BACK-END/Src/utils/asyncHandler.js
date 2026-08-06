const asyncHandler = (controller) => {
  return (request, response, next) => {
    Promise.resolve(controller(request, response, next)).catch(next);
  };
};

module.exports = asyncHandler;