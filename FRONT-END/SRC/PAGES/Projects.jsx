import {
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  FaChartLine,
  FaCode,
  FaExclamationTriangle,
  FaFolderOpen,
  FaPlus,
  FaSearch,
  FaShieldAlt,
  FaTrash,
} from "react-icons/fa";

import { useNavigate } from "react-router-dom";

import { AnalysisContext } from "../context/analysis-context";

import {
  createProject,
  deleteProject,
  getProjects,
} from "../services/projects";

import {
  getProjectScanHistory,
} from "../services/scan";

import "../styles/Projects.css";

const LANGUAGE_OPTIONS = [
  "Multi-language",
  "Python",
  "JavaScript",
  "TypeScript",
  "Java",
  "C",
  "C++",
  "Go",
  "PHP",
  "Ruby",
  "Rust",
];

function normaliseLanguage(value) {
  const language = String(value || "").trim();

  if (!language) {
    return "Multi-language";
  }

  const map = {
    python: "Python",
    javascript: "JavaScript",
    typescript: "TypeScript",
    java: "Java",
    c: "C",
    cpp: "C++",
    go: "Go",
    php: "PHP",
    ruby: "Ruby",
    rust: "Rust",
  };

  return map[language.toLowerCase()] || language;
}

function getIssueTotal(scan) {
  if (Array.isArray(scan?.issues)) {
    return scan.issues.length;
  }

  const counts = scan?.issueCount || {};

  return (
    Number(counts.critical || 0) +
    Number(counts.high || 0) +
    Number(counts.medium || 0) +
    Number(counts.low || 0) +
    Number(counts.info || 0)
  );
}

function formatDate(value, includeTime = false) {
  if (!value) {
    return "Never";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(includeTime
      ? {
          hour: "2-digit",
          minute: "2-digit",
        }
      : {}),
  });
}

function buildProjectStats(project, scans = []) {
  const sorted = [...scans].sort(
    (a, b) =>
      new Date(b.createdAt || b.completedAt || 0) -
      new Date(a.createdAt || a.completedAt || 0),
  );

  const latest = sorted[0] || null;

  const latestScore =
    latest?.securityScore ??
    project?.latestSecurityScore ??
    null;

  const totalScans =
    sorted.length ||
    Number(project?.totalScans || 0);

  const openIssues =
    latest
      ? getIssueTotal(latest)
      : 0;

  const latestLanguage =
    latest?.language
      ? normaliseLanguage(latest.language)
      : normaliseLanguage(
          project?.primaryLanguage ||
            "Multi-language",
        );

  const lastScannedAt =
    latest?.completedAt ||
    latest?.createdAt ||
    project?.lastScannedAt ||
    null;

  return {
    totalScans,
    latestScore,
    openIssues,
    latestLanguage,
    lastScannedAt,
  };
}

export default function Projects() {
  const navigate = useNavigate();

  const {
    selectedProjectId,
    setSelectedProjectId,
    setAnalysisResult,
    scanRefreshKey,
  } = useContext(AnalysisContext);

  const [projects, setProjects] =
    useState([]);

  const [projectStats, setProjectStats] =
    useState({});

  const [loading, setLoading] =
    useState(true);

  const [creating, setCreating] =
    useState(false);

  const [
    deletingProjectId,
    setDeletingProjectId,
  ] = useState(null);

  const [showCreateForm, setShowCreateForm] =
    useState(false);

  const [searchTerm, setSearchTerm] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  const [form, setForm] =
    useState({
      name: "",
      description: "",
      primaryLanguage:
        "Multi-language",
    });

  useEffect(() => {
    loadProjects();
  }, [scanRefreshKey]);

  async function loadProjectStats(
    projectList,
  ) {
    const entries =
      await Promise.all(
        projectList.map(
          async (project) => {
            try {
              const scans =
                await getProjectScanHistory(
                  project._id,
                );

              return [
                project._id,
                buildProjectStats(
                  project,
                  Array.isArray(scans)
                    ? scans
                    : [],
                ),
              ];
            } catch (statsError) {
              console.error(
                `PROJECT STATS ERROR (${project._id}):`,
                statsError,
              );

              return [
                project._id,
                buildProjectStats(
                  project,
                  [],
                ),
              ];
            }
          },
        ),
      );

    setProjectStats(
      Object.fromEntries(entries),
    );
  }

  async function loadProjects() {
    try {
      setLoading(true);
      setError("");

      const result =
        await getProjects();

      const list =
        Array.isArray(result)
          ? result
          : [];

      setProjects(list);

      const storedProjectId =
        localStorage.getItem(
          "selectedProjectId",
        );

      const storedExists =
        list.some(
          (project) =>
            project._id ===
            storedProjectId,
        );

      if (
        storedProjectId &&
        storedExists
      ) {
        setSelectedProjectId(
          storedProjectId,
        );
      } else if (
        list.length > 0
      ) {
        const firstId =
          list[0]._id;

        setSelectedProjectId(
          firstId,
        );

        localStorage.setItem(
          "selectedProjectId",
          firstId,
        );
      } else {
        setSelectedProjectId("");

        localStorage.removeItem(
          "selectedProjectId",
        );
      }

      await loadProjectStats(list);
    } catch (loadError) {
      console.error(
        "PROJECT LOAD ERROR:",
        loadError,
      );

      setError(
        loadError.message ||
          "Unable to load projects.",
      );
    } finally {
      setLoading(false);
    }
  }

  const filteredProjects =
    useMemo(() => {
      const query =
        searchTerm
          .trim()
          .toLowerCase();

      if (!query) {
        return projects;
      }

      return projects.filter(
        (project) => {
          const stats =
            projectStats[
              project._id
            ];

          return [
            project.name,
            project.description,
            project.primaryLanguage,
            stats?.latestLanguage,
          ]
            .filter(Boolean)
            .some((value) =>
              String(value)
                .toLowerCase()
                .includes(query),
            );
        },
      );
    }, [
      projects,
      projectStats,
      searchTerm,
    ]);

  function updateForm(
    key,
    value,
  ) {
    setForm(
      (current) => ({
        ...current,
        [key]: value,
      }),
    );
  }

  async function handleCreateProject(
    event,
  ) {
    event.preventDefault();

    setError("");
    setMessage("");

    const name =
      form.name.trim();

    if (!name) {
      setError(
        "Project name is required.",
      );

      return;
    }

    try {
      setCreating(true);

      const newProject =
        await createProject({
          name,
          description:
            form.description.trim(),
          primaryLanguage:
            form.primaryLanguage,
          sourceType: "paste",
        });

      const nextProjects = [
        newProject,
        ...projects,
      ];

      setProjects(nextProjects);

      setProjectStats(
        (current) => ({
          ...current,
          [newProject._id]:
            buildProjectStats(
              newProject,
              [],
            ),
        }),
      );

      setSelectedProjectId(
        newProject._id,
      );

      localStorage.setItem(
        "selectedProjectId",
        newProject._id,
      );

      setForm({
        name: "",
        description: "",
        primaryLanguage:
          "Multi-language",
      });

      setShowCreateForm(false);

      setMessage(
        "Project created successfully.",
      );

      setTimeout(
        () => setMessage(""),
        2500,
      );
    } catch (createError) {
      console.error(
        "PROJECT CREATE ERROR:",
        createError,
      );

      setError(
        createError.message ||
          "Unable to create project.",
      );
    } finally {
      setCreating(false);
    }
  }

  function selectProject(project) {
    setSelectedProjectId(
      project._id,
    );

    localStorage.setItem(
      "selectedProjectId",
      project._id,
    );

    setMessage(
      `${project.name} selected.`,
    );

    setTimeout(
      () => setMessage(""),
      1800,
    );
  }

  function scanProject(project) {
    setSelectedProjectId(
      project._id,
    );

    localStorage.setItem(
      "selectedProjectId",
      project._id,
    );

    navigate("/dashboard");
  }

  async function handleDeleteProject(
    project,
  ) {
    const confirmed =
      window.confirm(
        `Delete "${project.name}"?\n\nThis will permanently delete the project and all scan history belonging to it.\n\nThis action cannot be undone.`,
      );

    if (!confirmed) {
      return;
    }

    try {
      setError("");
      setMessage("");

      setDeletingProjectId(
        project._id,
      );

      const result =
        await deleteProject(
          project._id,
        );

      const remainingProjects =
        projects.filter(
          (item) =>
            item._id !==
            project._id,
        );

      setProjects(
        remainingProjects,
      );

      setProjectStats(
        (current) => {
          const next = {
            ...current,
          };

          delete next[
            project._id
          ];

          return next;
        },
      );

      const deletingActiveProject =
        selectedProjectId ===
        project._id;

      if (
        deletingActiveProject
      ) {
        setAnalysisResult?.(null);

        if (
          remainingProjects.length >
          0
        ) {
          const nextProject =
            remainingProjects[0];

          setSelectedProjectId(
            nextProject._id,
          );

          localStorage.setItem(
            "selectedProjectId",
            nextProject._id,
          );
        } else {
          setSelectedProjectId("");

          localStorage.removeItem(
            "selectedProjectId",
          );
        }
      }

      const deletedScanCount =
        result?.deletedScans || 0;

      setMessage(
        deletedScanCount > 0
          ? `Project deleted successfully. ${deletedScanCount} associated ${
              deletedScanCount === 1
                ? "scan was"
                : "scans were"
            } also removed.`
          : "Project deleted successfully.",
      );

      setTimeout(
        () => setMessage(""),
        3000,
      );
    } catch (deleteError) {
      console.error(
        "PROJECT DELETE ERROR:",
        deleteError,
      );

      setError(
        deleteError.message ||
          "Unable to delete project.",
      );
    } finally {
      setDeletingProjectId(
        null,
      );
    }
  }

  return (
    <div className="projects-page">
      <div className="projects-page-header">
        <div>
          <span className="projects-eyebrow">
            CODEGUARD WORKSPACE
          </span>

          <h1>Projects</h1>

          <p>
            Organize security scans by
            application, repository or
            development project.
          </p>
        </div>

        <button
          type="button"
          className="create-project-main"
          onClick={() =>
            setShowCreateForm(
              (current) =>
                !current,
            )
          }
        >
          <FaPlus />

          {showCreateForm
            ? "Close"
            : "New Project"}
        </button>
      </div>

      {message && (
        <div className="projects-message success">
          ✓ {message}
        </div>
      )}

      {error && (
        <div className="projects-message error">
          {error}
        </div>
      )}

      {showCreateForm && (
        <form
          className="project-create-card"
          onSubmit={
            handleCreateProject
          }
        >
          <div className="project-create-heading">
            <div className="project-create-icon">
              <FaFolderOpen />
            </div>

            <div>
              <h2>
                Create New Project
              </h2>

              <p>
                Create a workspace for
                grouping related source
                code scans.
              </p>
            </div>
          </div>

          <div className="project-form-grid">
            <div className="project-form-field">
              <label htmlFor="projectName">
                Project Name
              </label>

              <input
                id="projectName"
                type="text"
                placeholder="e.g. Secure Banking API"
                value={form.name}
                onChange={(event) =>
                  updateForm(
                    "name",
                    event.target.value,
                  )
                }
                disabled={creating}
              />
            </div>

            <div className="project-form-field">
              <label htmlFor="projectLanguage">
                Primary Language
              </label>

              <select
                id="projectLanguage"
                value={
                  form.primaryLanguage
                }
                onChange={(event) =>
                  updateForm(
                    "primaryLanguage",
                    event.target.value,
                  )
                }
                disabled={creating}
              >
                {LANGUAGE_OPTIONS.map(
                  (language) => (
                    <option
                      value={
                        language
                      }
                      key={
                        language
                      }
                    >
                      {language}
                    </option>
                  ),
                )}
              </select>
            </div>
          </div>

          <div className="project-form-field">
            <label htmlFor="projectDescription">
              Description
            </label>

            <textarea
              id="projectDescription"
              rows="3"
              placeholder="Briefly describe this project..."
              value={
                form.description
              }
              onChange={(event) =>
                updateForm(
                  "description",
                  event.target.value,
                )
              }
              disabled={creating}
            />
          </div>

          <div className="project-create-actions">
            <button
              type="button"
              className="project-cancel-button"
              onClick={() =>
                setShowCreateForm(
                  false,
                )
              }
              disabled={creating}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="project-create-button"
              disabled={creating}
            >
              <FaPlus />

              {creating
                ? "Creating..."
                : "Create Project"}
            </button>
          </div>
        </form>
      )}

      <div className="projects-overview">
        <div className="project-stat">
          <span>
            Total Projects
          </span>

          <strong>
            {projects.length}
          </strong>
        </div>

        <div className="project-stat">
          <span>
            Active Project
          </span>

          <strong className="active-project-stat">
            {projects.find(
              (project) =>
                project._id ===
                selectedProjectId,
            )?.name ||
              "None selected"}
          </strong>
        </div>

        <div className="project-stat">
          <span>
            Workspace Status
          </span>

          <strong className="workspace-ready">
            Ready
          </strong>
        </div>
      </div>

      <div className="projects-toolbar">
        <div className="projects-search">
          <FaSearch />

          <input
            type="text"
            placeholder="Search projects..."
            value={searchTerm}
            onChange={(event) =>
              setSearchTerm(
                event.target.value,
              )
            }
          />
        </div>

        <span>
          {filteredProjects.length}{" "}
          {filteredProjects.length ===
          1
            ? "project"
            : "projects"}
        </span>
      </div>

      {loading ? (
        <div className="projects-state-card">
          <div className="projects-loader" />

          <h2>
            Loading projects
          </h2>

          <p>
            Retrieving your CodeGuard
            workspaces...
          </p>
        </div>
      ) : projects.length === 0 ? (
        <div className="projects-state-card">
          <FaFolderOpen />

          <h2>No projects yet</h2>

          <p>
            Create your first project
            to organize security scans.
          </p>

          <button
            type="button"
            onClick={() =>
              setShowCreateForm(true)
            }
          >
            <FaPlus />
            Create Project
          </button>
        </div>
      ) : filteredProjects.length ===
        0 ? (
        <div className="projects-state-card">
          <FaSearch />

          <h2>
            No matching projects
          </h2>

          <p>
            Try another search term.
          </p>
        </div>
      ) : (
        <div className="projects-grid">
          {filteredProjects.map(
            (project) => {
              const isSelected =
                project._id ===
                selectedProjectId;

              const isDeleting =
                deletingProjectId ===
                project._id;

              const stats =
                projectStats[
                  project._id
                ] ||
                buildProjectStats(
                  project,
                  [],
                );

              return (
                <article
                  className={`project-card ${
                    isSelected
                      ? "selected"
                      : ""
                  }`}
                  key={project._id}
                >
                  <div className="project-card-top">
                    <div className="project-icon">
                      <FaFolderOpen />
                    </div>

                    {isSelected && (
                      <span className="active-project-badge">
                        Active
                      </span>
                    )}
                  </div>

                  <h2>
                    {project.name}
                  </h2>

                  <p className="project-description">
                    {project.description ||
                      "No project description provided."}
                  </p>

                  <div className="project-meta">
                    <div>
                      <FaCode />

                      <span>
                        {stats.latestLanguage}
                      </span>
                    </div>

                    <div>
                      <FaShieldAlt />

                      <span>
                        Security workspace
                      </span>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(2, minmax(0, 1fr))",
                      gap: "8px",
                      marginTop: "14px",
                    }}
                  >
                    <div
                      style={{
                        padding: "10px",
                        borderRadius: "9px",
                        border:
                          "1px solid rgba(148,163,184,.14)",
                        background:
                          "rgba(15,23,42,.35)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          gap: "6px",
                          alignItems:
                            "center",
                          fontSize: "9px",
                          opacity: 0.7,
                          marginBottom:
                            "5px",
                        }}
                      >
                        <FaChartLine />
                        Total Scans
                      </div>

                      <strong
                        style={{
                          fontSize:
                            "16px",
                        }}
                      >
                        {stats.totalScans}
                      </strong>
                    </div>

                    <div
                      style={{
                        padding: "10px",
                        borderRadius: "9px",
                        border:
                          "1px solid rgba(148,163,184,.14)",
                        background:
                          "rgba(15,23,42,.35)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          gap: "6px",
                          alignItems:
                            "center",
                          fontSize: "9px",
                          opacity: 0.7,
                          marginBottom:
                            "5px",
                        }}
                      >
                        <FaShieldAlt />
                        Latest Score
                      </div>

                      <strong
                        style={{
                          fontSize:
                            "16px",
                        }}
                      >
                        {stats.latestScore ===
                        null
                          ? "—"
                          : `${stats.latestScore}/100`}
                      </strong>
                    </div>

                    <div
                      style={{
                        padding: "10px",
                        borderRadius: "9px",
                        border:
                          "1px solid rgba(148,163,184,.14)",
                        background:
                          "rgba(15,23,42,.35)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          gap: "6px",
                          alignItems:
                            "center",
                          fontSize: "9px",
                          opacity: 0.7,
                          marginBottom:
                            "5px",
                        }}
                      >
                        <FaExclamationTriangle />
                        Open Issues
                      </div>

                      <strong
                        style={{
                          fontSize:
                            "16px",
                        }}
                      >
                        {stats.openIssues}
                      </strong>
                    </div>

                    <div
                      style={{
                        padding: "10px",
                        borderRadius: "9px",
                        border:
                          "1px solid rgba(148,163,184,.14)",
                        background:
                          "rgba(15,23,42,.35)",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "9px",
                          opacity: 0.7,
                          marginBottom:
                            "5px",
                        }}
                      >
                        Last Scan
                      </div>

                      <strong
                        style={{
                          fontSize:
                            "10px",
                          lineHeight: 1.4,
                        }}
                      >
                        {formatDate(
                          stats.lastScannedAt,
                          true,
                        )}
                      </strong>
                    </div>
                  </div>

                  <div className="project-created-date">
                    Created{" "}
                    {formatDate(
                      project.createdAt,
                    )}
                  </div>

                  <div
                    className="project-card-actions"
                    style={{
                      gridTemplateColumns:
                        "repeat(3, minmax(0, 1fr))",
                    }}
                  >
                    <button
                      type="button"
                      className="select-project-button"
                      onClick={() =>
                        selectProject(
                          project,
                        )
                      }
                      disabled={
                        isSelected ||
                        isDeleting
                      }
                    >
                      {isSelected
                        ? "✓ Selected"
                        : "Select"}
                    </button>

                    <button
                      type="button"
                      className="scan-project-button"
                      onClick={() =>
                        scanProject(
                          project,
                        )
                      }
                      disabled={
                        isDeleting
                      }
                    >
                      Scan Code
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleDeleteProject(
                          project,
                        )
                      }
                      disabled={
                        isDeleting
                      }
                      style={{
                        minHeight:
                          "36px",
                        borderRadius:
                          "8px",
                        border:
                          "1px solid rgba(239,68,68,.35)",
                        background:
                          "rgba(239,68,68,.10)",
                        color:
                          "#fca5a5",
                        cursor:
                          isDeleting
                            ? "not-allowed"
                            : "pointer",
                        fontWeight:
                          "800",
                        fontSize:
                          "9px",
                        display:
                          "flex",
                        alignItems:
                          "center",
                        justifyContent:
                          "center",
                        gap: "6px",
                        opacity:
                          isDeleting
                            ? 0.55
                            : 1,
                      }}
                    >
                      <FaTrash />

                      {isDeleting
                        ? "Deleting..."
                        : "Delete"}
                    </button>
                  </div>
                </article>
              );
            },
          )}
        </div>
      )}
    </div>
  );
}
