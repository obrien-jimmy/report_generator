import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { FaSave, FaFolderOpen, FaPlus, FaTrash, FaDownload, FaUpload, FaCopy } from 'react-icons/fa';

const ProjectManager = forwardRef(({ 
  currentProject, 
  setCurrentProject,
  onLoadProject, 
  onNewProject,
  finalThesis,
  paperLength,
  sourceCategories,
  methodology,
  selectedPaperType,
  outlineData,
  draftData,
  thesisFinalized,
  categoriesFinalized,
  sourceCategoriesActivated,
  readyForOutline,
  frameworkComplete,
  activeTab,
  showDebugSections,
  setShowDebugSections
}, ref) => {
  const [projects, setProjects] = useState([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [showSaveAsModal, setShowSaveAsModal] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [editingProject, setEditingProject] = useState(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');

  // Expose quickSave function to parent component
  useImperativeHandle(ref, () => ({
    quickSave
  }));

  useEffect(() => {
    loadProjectsList();
  }, []);

  const loadProjectsList = () => {
    try {
      const savedProjects = localStorage.getItem('report_generator_projects');
      console.log('Raw saved projects:', savedProjects); // Debug log
      if (savedProjects) {
        const parsedProjects = JSON.parse(savedProjects);
        console.log('Parsed projects:', parsedProjects); // Debug log
        setProjects(Array.isArray(parsedProjects) ? parsedProjects : []);
      } else {
        setProjects([]);
      }
    } catch (error) {
      console.error('Error loading projects:', error);
      setProjects([]);
    }
  };

  const saveCurrentProject = (isNewSave = false) => {
    if (!projectName.trim()) {
      alert('Please enter a project name');
      return;
    }

    const projectData = {
      id: (isNewSave || !currentProject) ? Date.now().toString() : currentProject.id,
      name: projectName,
      description: projectDescription,
      createdAt: (isNewSave || !currentProject) ? new Date().toISOString() : currentProject.createdAt,
      updatedAt: new Date().toISOString(),
      data: {
        // User inputs
        finalThesis,
        paperLength,
        sourceCategories,
        methodology, // <-- should be the full object, not a string
        selectedPaperType,
        
        // State flags
        thesisFinalized,
        categoriesFinalized,
        sourceCategoriesActivated,
        readyForOutline,
        frameworkComplete,
        activeTab,
        
        // Generated outputs - this should include full outline with contexts
        outlineData, // This already contains section_context and subsection_context
        draftData
      }
    };

    const existingProjects = [...projects];
    const existingIndex = existingProjects.findIndex(p => p.id === projectData.id);
    
    if (existingIndex >= 0 && !isNewSave) {
      existingProjects[existingIndex] = projectData;
    } else {
      existingProjects.push(projectData);
    }

    setProjects(existingProjects);
    localStorage.setItem('report_generator_projects', JSON.stringify(existingProjects));
    
    // Update current project reference and set as active project
    const updatedProject = existingProjects.find(p => p.id === projectData.id);
    if (updatedProject) {
      // Update the current project state to display in the active project box
      setCurrentProject(updatedProject);
    }
    
    setShowSaveModal(false);
    setShowSaveAsModal(false);
    setProjectName('');
    setProjectDescription('');
    
    alert(`Project ${isNewSave ? 'saved as new project' : 'saved'} successfully!`);
  };

  const quickSave = (silent = false) => {
    if (!currentProject) {
      // No current project, open save modal
      if (!silent) {
        openSaveModal();
      }
      return;
    }

    // Quick save to existing project
    const projectData = {
      ...currentProject,
      updatedAt: new Date().toISOString(),
      data: {
        finalThesis,
        paperLength,
        sourceCategories,
        methodology, // <-- should be the full object, not a string
        selectedPaperType,
        thesisFinalized,
        categoriesFinalized,
        sourceCategoriesActivated,
        readyForOutline,
        frameworkComplete,
        activeTab,
        outlineData,
        draftData
      }
    };

    const existingProjects = [...projects];
    const existingIndex = existingProjects.findIndex(p => p.id === currentProject.id);
    
    if (existingIndex >= 0) {
      existingProjects[existingIndex] = projectData;
      setProjects(existingProjects);
      localStorage.setItem('report_generator_projects', JSON.stringify(existingProjects));
      
      // Update the current project state to display in the active project box
      setCurrentProject(projectData);
      
      if (!silent) {
        alert('Project saved successfully!');
      }
    } else {
      // Project not found, treat as new save
      if (!silent) {
        openSaveModal();
      }
    }
  };

  const loadProject = (project) => {
    onLoadProject(project);
    setShowLoadModal(false);
  };

  const deleteProject = (projectId) => {
    if (window.confirm('Are you sure you want to delete this project?')) {
      const updatedProjects = projects.filter(p => p.id !== projectId);
      setProjects(updatedProjects);
      localStorage.setItem('report_generator_projects', JSON.stringify(updatedProjects));
      loadProjectsList(); // Refresh the list
    }
  };

  const startEditProject = (project) => {
    setEditingProject(project.id);
    setEditName(project.name);
    setEditDescription(project.description || '');
  };

  const cancelEditProject = () => {
    setEditingProject(null);
    setEditName('');
    setEditDescription('');
  };

  const saveEditProject = (projectId) => {
    if (!editName.trim()) {
      alert('Please enter a project name');
      return;
    }

    const updatedProjects = projects.map(project => {
      if (project.id === projectId) {
        return {
          ...project,
          name: editName,
          description: editDescription,
          updatedAt: new Date().toISOString()
        };
      }
      return project;
    });

    setProjects(updatedProjects);
    localStorage.setItem('report_generator_projects', JSON.stringify(updatedProjects));
    
    // Update current project if it's the one being edited
    if (currentProject && currentProject.id === projectId) {
      const updatedCurrentProject = updatedProjects.find(p => p.id === projectId);
      setCurrentProject(updatedCurrentProject);
    }
    
    setEditingProject(null);
    setEditName('');
    setEditDescription('');
  };

  const exportProject = (project) => {
    const dataStr = JSON.stringify(project, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${project.name.replace(/[^a-z0-9]/gi, '_')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const importProject = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const projectData = JSON.parse(e.target.result);
          projectData.id = Date.now().toString(); // New ID to avoid conflicts
          projectData.updatedAt = new Date().toISOString();
          
          const updatedProjects = [...projects, projectData];
          setProjects(updatedProjects);
          localStorage.setItem('report_generator_projects', JSON.stringify(updatedProjects));
          
          alert('Project imported successfully!');
          loadProjectsList(); // Refresh the list
        } catch (error) {
          console.error('Error importing project:', error);
          alert(`Error importing project file: ${error.message}`);
        }
      };
      reader.readAsText(file);
    }
    event.target.value = ''; // Reset file input
  };

  const openSaveModal = () => {
    setProjectName('');
    setProjectDescription('');
    setShowSaveModal(true);
  };

  const openSaveAsModal = () => {
    if (currentProject) {
      setProjectName(`${currentProject.name} - Copy`);
      setProjectDescription(currentProject.description || '');
    } else {
      setProjectName('');
      setProjectDescription('');
    }
    setShowSaveAsModal(true);
  };

  // Helper function to safely display data
  const safeDisplayData = (data, maxLength = 50) => {
    if (!data) return 'Not set';
    if (typeof data === 'string') {
      return data.length > maxLength ? `${data.substring(0, maxLength)}...` : data;
    }
    if (Array.isArray(data)) {
      if (data.length === 0) return 'None selected';
      // For source categories, show count and first category name
      const firstItem = data[0];
      if (typeof firstItem === 'object' && firstItem.name) {
        return data.length === 1 ? firstItem.name : `${firstItem.name} + ${data.length - 1} more`;
      }
      return `${data.length} items`;
    }
    if (typeof data === 'object') {
      return `${Object.keys(data).length} items`;
    }
    return String(data);
  };

  return (
    <div className="project-manager">
      <div className="row align-items-center mb-3">
        <div className="col-md-12">
          <div className="d-flex gap-2 flex-wrap">
            <button 
              className="btn btn-success btn-sm"
              onClick={quickSave}
              title={currentProject ? `Save to ${currentProject.name}` : 'Save Project'}
            >
              <FaSave className="me-1" />
              {currentProject ? 'Save' : 'Save Project'}
            </button>
            
            {currentProject && (
              <button 
                className="btn btn-success btn-sm"
                onClick={openSaveAsModal}
                title="Save as new project"
              >
                <FaCopy className="me-1" />
                Save As
              </button>
            )}
            
            <button 
              className="btn btn-primary btn-sm"
              onClick={() => {
                loadProjectsList();
                setShowLoadModal(true);
              }}
            >
              <FaFolderOpen className="me-1" />
              Load Project
            </button>
            
            <button 
              className="btn btn-outline-secondary btn-sm"
              onClick={onNewProject}
            >
              <FaPlus className="me-1" />
              New Project
            </button>
            
            <label className="btn btn-outline-secondary btn-sm">
              <FaDownload className="me-1" /> {/* <-- Download for Import */}
              Import
              <input 
                type="file" 
                accept=".json" 
                onChange={importProject}
                style={{ display: 'none' }}
              />
            </label>

            <button
              className="btn btn-outline-secondary btn-sm"
              onClick={() => {
                if (currentProject) {
                  exportProject(currentProject);
                } else {
                  alert('No project selected to export.');
                }
              }}
              title="Export Current Project"
            >
              <FaUpload className="me-1" /> {/* <-- Upload for Export */}
              Export
            </button>
          </div>
        </div>
      </div>

      {currentProject && (
        <div className="current-project-info mb-3 p-3 bg-light rounded border">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <strong className="text-primary">Active Project: {currentProject.name}</strong>
              {currentProject.description && (
                <div className="text-muted small mt-1">{currentProject.description}</div>
              )}
            </div>
            <div className="text-muted small">
              Last saved: {new Date(currentProject.updatedAt).toLocaleString()}
            </div>
          </div>
        </div>
      )}

      {/* Save Modal (for new projects or when no current project) */}
      {showSaveModal && (
        <div className="modal-overlay" onClick={() => setShowSaveModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Save New Project</h5>
              <button
                type="button"
                className="btn-close"
                onClick={() => setShowSaveModal(false)}
                aria-label="Close"
              ></button>
            </div>
            
            <div className="modal-body">
              <div className="mb-3">
                <label className="form-label">Project Name</label>
                <input 
                  type="text"
                  className="form-control"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Enter project name"
                  required
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Description (Optional)</label>
                <textarea 
                  className="form-control"
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  placeholder="Enter project description"
                  rows="3"
                />
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowSaveModal(false)}
              >
                Cancel
              </button>
              <button 
                type="button"
                className="btn btn-success"
                onClick={() => saveCurrentProject(false)}
              >
                Save Project
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save As Modal */}
      {showSaveAsModal && (
        <div className="modal-overlay" onClick={() => setShowSaveAsModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Save As New Project</h5>
              <button
                type="button"
                className="btn-close"
                onClick={() => setShowSaveAsModal(false)}
                aria-label="Close"
              ></button>
            </div>
            
            <div className="modal-body">
              <div className="mb-3">
                <label className="form-label">Project Name</label>
                <input 
                  type="text"
                  className="form-control"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Enter project name"
                  required
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Description (Optional)</label>
                <textarea 
                  className="form-control"
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  placeholder="Enter project description"
                  rows="3"
                />
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowSaveAsModal(false)}
              >
                Cancel
              </button>
              <button 
                type="button"
                className="btn btn-success"
                onClick={() => saveCurrentProject(true)}
              >
                Save As New
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Load Modal */}
      {showLoadModal && (
        <div className="modal-overlay" onClick={() => setShowLoadModal(false)}>
          <div className="modal-content-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Load Project ({projects.length} projects found)</h5>
              <button
                type="button"
                className="btn-close"
                onClick={() => setShowLoadModal(false)}
                aria-label="Close"
              ></button>
            </div>
            
            <div className="modal-body">
              {projects.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-muted">No saved projects found</p>
                  <button 
                    className="btn btn-primary btn-sm"
                    onClick={() => {
                      setShowLoadModal(false);
                      openSaveModal();
                    }}
                  >
                    Create Your First Project
                  </button>
                </div>
              ) : (
                <div className="projects-list">
                  {projects.map((project) => (
                    <div key={project.id} className="card mb-3">
                      <div className="card-body">
                        <div className="d-flex justify-content-between align-items-start">
                          <div className="flex-grow-1 me-3">
                            {editingProject === project.id ? (
                              // Edit mode
                              <div className="mb-3">
                                <input
                                  type="text"
                                  className="form-control mb-2"
                                  value={editName}
                                  onChange={(e) => setEditName(e.target.value)}
                                  placeholder="Project name"
                                />
                                <textarea
                                  className="form-control mb-2"
                                  value={editDescription}
                                  onChange={(e) => setEditDescription(e.target.value)}
                                  placeholder="Description (optional)"
                                  rows="2"
                                />
                                <div className="d-flex gap-2">
                                  <button
                                    className="btn btn-sm btn-success"
                                    onClick={() => saveEditProject(project.id)}
                                  >
                                    Save
                                  </button>
                                  <button
                                    className="btn btn-sm btn-secondary"
                                    onClick={cancelEditProject}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              // View mode
                              <>
                                <h6 className="card-title mb-1">
                                  {project.name}
                                  {currentProject && currentProject.id === project.id && (
                                    <span className="badge bg-success ms-2">Active</span>
                                  )}
                                </h6>
                                {project.description && (
                                  <p className="card-text text-muted small mb-2">{project.description}</p>
                                )}
                              </>
                            )}
                            
                            <div className="small text-muted">
                              <div>Created: {new Date(project.createdAt).toLocaleDateString()}</div>
                              <div>Updated: {new Date(project.updatedAt).toLocaleDateString()}</div>
                              <div>Thesis: {safeDisplayData(project.data?.finalThesis)}</div>
                              <div>Paper Type: {safeDisplayData(project.data?.selectedPaperType?.name || project.data?.selectedPaperType)}</div>
                              <div>Source Categories: {safeDisplayData(project.data?.sourceCategories)}</div>
                              <div>Outline Sections: {project.data?.outlineData ? project.data.outlineData.length : 0}</div>
                              <div>Active Tab: {project.data?.activeTab || 'framework'}</div>
                            </div>
                          </div>
                          <div className="d-flex flex-column gap-1">
                            {editingProject !== project.id && (
                              <>
                                <button
                                  className="btn btn-sm btn-primary"
                                  onClick={() => loadProject(project)}
                                >
                                  Load
                                </button>
                                <button
                                  className="btn btn-sm btn-outline-secondary"
                                  onClick={() => startEditProject(project)}
                                >
                                  Edit
                                </button>
                                <button
                                  className="btn btn-sm btn-outline-info"
                                  onClick={() => exportProject(project)}
                                >
                                  <FaUpload />
                                </button>
                                <button
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={() => deleteProject(project.id)}
                                >
                                  <FaTrash />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowLoadModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default ProjectManager;