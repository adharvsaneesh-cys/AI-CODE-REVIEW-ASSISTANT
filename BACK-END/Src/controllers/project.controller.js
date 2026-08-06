const Project = require("../models/Project");

const createProject = async (request, response) => {
  const project = await Project.create({
    ...request.body,
    owner: request.user._id,
  });

  return response.status(201).json({
    success: true,
    message: "Project created successfully",
    project,
  });
};

const listProjects = async (request, response) => {
  const page = Math.max(Number(request.query.page) || 1, 1);
  const limit = Math.min(
    Math.max(Number(request.query.limit) || 10, 1),
    50,
  );

  const skip = (page - 1) * limit;

  const filter = {
    owner: request.user._id,
  };

  if (request.query.status) {
    filter.status = request.query.status;
  }

  if (request.query.search) {
    filter.name = {
      $regex: request.query.search.trim(),
      $options: "i",
    };
  }

  const [projects, total] = await Promise.all([
    Project.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),

    Project.countDocuments(filter),
  ]);

  return response.status(200).json({
    success: true,
    projects,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
};

const getProject = async (request, response) => {
  const project = await Project.findOne({
    _id: request.params.projectId,
    owner: request.user._id,
  });

  if (!project) {
    return response.status(404).json({
      success: false,
      message: "Project not found",
    });
  }

  return response.status(200).json({
    success: true,
    project,
  });
};

const updateProject = async (request, response) => {
  const project = await Project.findOneAndUpdate(
    {
      _id: request.params.projectId,
      owner: request.user._id,
    },
    {
      $set: request.body,
    },
    {
      new: true,
      runValidators: true,
    },
  );

  if (!project) {
    return response.status(404).json({
      success: false,
      message: "Project not found",
    });
  }

  return response.status(200).json({
    success: true,
    message: "Project updated successfully",
    project,
  });
};

const deleteProject = async (request, response) => {
  const project = await Project.findOneAndDelete({
    _id: request.params.projectId,
    owner: request.user._id,
  });

  if (!project) {
    return response.status(404).json({
      success: false,
      message: "Project not found",
    });
  }

  return response.status(200).json({
    success: true,
    message: "Project deleted successfully",
  });
};

module.exports = {
  createProject,
  listProjects,
  getProject,
  updateProject,
  deleteProject,
};