export function getDashboardHtml() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>AutoClaude Dashboard</title>
<style>
  :root {
    --bg: #0d1117; --bg2: #161b22; --bg3: #21262d; --bg4: #30363d;
    --text: #e6edf3; --text2: #8b949e; --text3: #484f58;
    --accent: #58a6ff; --green: #3fb950; --red: #f85149;
    --orange: #d29922; --purple: #bc8cff;
    --border: #30363d; --radius: 8px;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, sans-serif; background: var(--bg); color: var(--text); line-height: 1.5; }

  /* Header */
  .header { background: var(--bg2); border-bottom: 1px solid var(--border); padding: 16px 24px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
  .header-left { display: flex; align-items: center; gap: 16px; }
  .header h1 { font-size: 18px; font-weight: 600; }
  .status-badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: 500; }
  .status-badge .dot { width: 8px; height: 8px; border-radius: 50%; }
  .status-SLEEP { background: #1a3a2a; color: var(--green); }
  .status-SLEEP .dot { background: var(--green); }
  .status-WAKE { background: #3a2a1a; color: var(--orange); }
  .status-WAKE .dot { background: var(--orange); }
  .status-WORK { background: #1a2a3a; color: var(--accent); }
  .status-WORK .dot { background: var(--accent); }
  .header-controls { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
  .time-input { display: flex; align-items: center; gap: 4px; font-size: 13px; color: var(--text2); }
  .time-input input[type="text"] { width: 58px; background: var(--bg3); border: 1px solid var(--border); color: var(--text); padding: 4px 6px; border-radius: 4px; font-size: 13px; text-align: center; font-family: 'SF Mono', Monaco, monospace; letter-spacing: 1px; }
  .btn { padding: 6px 16px; border-radius: 6px; border: 1px solid var(--border); background: var(--bg3); color: var(--text); cursor: pointer; font-size: 13px; font-weight: 500; transition: all 0.15s; }
  .btn:hover { background: var(--bg4); }
  .btn-primary { background: var(--green); border-color: var(--green); color: #000; }
  .btn-primary:hover { opacity: 0.9; }
  .btn-danger { background: var(--red); border-color: var(--red); color: #fff; }
  .btn-danger:hover { opacity: 0.9; }
  .btn-sm { padding: 3px 10px; font-size: 12px; }

  /* Container */
  .container { max-width: 1100px; margin: 0 auto; padding: 24px; }

  /* Section */
  .section { margin-bottom: 24px; }
  .section-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 0; cursor: pointer; user-select: none; }
  .section-header h2 { font-size: 15px; font-weight: 600; display: flex; align-items: center; gap: 8px; }
  .section-header .chevron { transition: transform 0.2s; font-size: 12px; color: var(--text2); }
  .section-header.open .chevron { transform: rotate(90deg); }
  .section-body { display: none; }
  .section-body.open { display: block; }

  /* Task Cards */
  .task-card { background: var(--bg2); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px; margin-bottom: 8px; display: flex; gap: 12px; align-items: flex-start; transition: border-color 0.15s, box-shadow 0.15s; }
  .task-card.dragging { opacity: 0.5; border-color: var(--accent); }
  .task-card.drag-over { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent); }
  .task-card.running { border-left: 3px solid var(--orange); }
  .task-card.completed { border-left: 3px solid var(--green); opacity: 0.7; }
  .task-card.failed { border-left: 3px solid var(--red); opacity: 0.7; }
  .drag-handle { cursor: grab; color: var(--text3); padding: 4px; font-size: 16px; line-height: 1; user-select: none; }
  .drag-handle:active { cursor: grabbing; }
  .task-content { flex: 1; min-width: 0; }
  .task-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 6px; }
  .task-title { font-weight: 600; font-size: 14px; }
  .task-meta { display: flex; align-items: center; gap: 12px; font-size: 12px; color: var(--text2); margin-bottom: 6px; flex-wrap: wrap; }
  .task-prompt { font-size: 13px; color: var(--text2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 8px; }
  .task-controls { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
  .task-controls select { background: var(--bg3); border: 1px solid var(--border); color: var(--text); padding: 3px 8px; border-radius: 4px; font-size: 12px; }
  .approve-btn { display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; border-radius: 4px; border: 1px solid; font-size: 12px; cursor: pointer; font-weight: 500; transition: all 0.15s; }
  .approve-btn.approved { background: #1a3a2a; border-color: var(--green); color: var(--green); }
  .approve-btn.unapproved { background: var(--bg3); border-color: var(--border); color: var(--text2); }

  /* Slider */
  .slider-group { display: flex; align-items: center; gap: 8px; font-size: 12px; }
  .slider-group input[type=range] { width: 100px; accent-color: var(--accent); }
  .slider-label { color: var(--text2); min-width: 60px; }

  /* Stats badge */
  .stats-row { display: flex; gap: 12px; font-size: 11px; color: var(--text3); margin-top: 6px; flex-wrap: wrap; }
  .stats-row span { display: inline-flex; align-items: center; gap: 3px; }

  /* Add Task Form */
  .add-form { background: var(--bg2); border: 1px dashed var(--border); border-radius: var(--radius); padding: 16px; margin-top: 8px; display: none; }
  .add-form.open { display: block; }
  .add-form input, .add-form textarea { width: 100%; background: var(--bg); border: 1px solid var(--border); color: var(--text); padding: 8px 10px; border-radius: 4px; font-size: 13px; font-family: inherit; margin-bottom: 8px; }
  .add-form textarea { min-height: 80px; resize: vertical; }
  .form-row { display: flex; gap: 8px; align-items: center; margin-bottom: 8px; }
  .form-row label { font-size: 12px; color: var(--text2); min-width: 80px; }

  /* Permission Profiles */
  .profile-tabs { display: flex; gap: 4px; margin-bottom: 12px; flex-wrap: wrap; }
  .profile-tab { padding: 6px 14px; border-radius: 6px; border: 1px solid var(--border); background: var(--bg3); color: var(--text2); cursor: pointer; font-size: 13px; transition: all 0.15s; }
  .profile-tab.active { background: var(--accent); border-color: var(--accent); color: #000; }
  .profile-editor { background: var(--bg2); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px; }
  .profile-editor .form-row input, .profile-editor .form-row select { background: var(--bg); border: 1px solid var(--border); color: var(--text); padding: 6px 10px; border-radius: 4px; font-size: 13px; flex: 1; }
  .profile-editor .form-row input[type=checkbox] { width: auto; flex: none; }
  .profile-card { background: var(--bg2); border: 1px solid var(--border); border-radius: var(--radius); padding: 14px 16px; margin-bottom: 8px; cursor: pointer; transition: border-color 0.15s; }
  .profile-card:hover { border-color: var(--accent); }
  .profile-card.selected { border-color: var(--accent); border-width: 2px; }
  .profile-card-header { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .profile-card-name { font-size: 14px; font-weight: 600; display: flex; align-items: center; gap: 8px; }
  .profile-card-name .default-badge { font-size: 10px; padding: 1px 6px; border-radius: 3px; background: rgba(88,166,255,0.15); color: var(--accent); font-weight: 500; }
  .profile-card-desc { font-size: 12px; color: var(--text2); margin-top: 4px; }
  .profile-card-meta { display: flex; gap: 12px; font-size: 11px; color: var(--text3); margin-top: 6px; }
  .tool-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }
  .tool-tag { display: inline-flex; align-items: center; gap: 3px; padding: 2px 8px; border-radius: 4px; font-size: 11px; cursor: pointer; transition: all 0.15s; user-select: none; }
  .tool-tag.allowed { background: rgba(63,185,80,0.12); color: var(--green); border: 1px solid rgba(63,185,80,0.2); }
  .tool-tag.disallowed { background: rgba(248,81,73,0.12); color: var(--red); border: 1px solid rgba(248,81,73,0.2); }
  .tool-tag.available { background: var(--bg3); color: var(--text3); border: 1px solid var(--border); }
  .tool-tag:hover { opacity: 0.8; }

  /* Usage Monitor */
  .usage-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  @media (max-width: 700px) { .usage-grid { grid-template-columns: 1fr; } }
  .usage-card { background: var(--bg2); border: 1px solid var(--border); border-radius: var(--radius); padding: 14px; }
  .usage-card h3 { font-size: 13px; font-weight: 500; color: var(--text2); margin-bottom: 8px; display: flex; justify-content: space-between; }
  .usage-bar { height: 6px; background: var(--bg4); border-radius: 3px; overflow: hidden; margin-bottom: 4px; }
  .usage-bar-fill { height: 100%; border-radius: 3px; transition: width 0.5s; }
  .usage-bar-fill.green { background: var(--green); }
  .usage-bar-fill.orange { background: var(--orange); }
  .usage-bar-fill.red { background: var(--red); }
  .usage-bar-fill.blue { background: var(--accent); }
  .usage-bar-fill.purple { background: var(--purple); }
  .usage-percent { font-size: 20px; font-weight: 600; }
  .usage-detail { font-size: 12px; color: var(--text2); }
  .usage-chart { background: var(--bg2); border: 1px solid var(--border); border-radius: var(--radius); padding: 14px; margin-top: 16px; }
  .usage-chart svg { width: 100%; height: 120px; }

  /* Setup form */
  .setup-row { display: flex; align-items: center; gap: 8px; margin-top: 12px; font-size: 12px; }
  .setup-row input { background: var(--bg); border: 1px solid var(--border); color: var(--text); padding: 4px 8px; border-radius: 4px; font-size: 12px; flex: 1; max-width: 300px; }

  /* Log */
  .log-output { background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius); padding: 12px; font-family: 'SF Mono', Monaco, monospace; font-size: 11px; max-height: 300px; overflow-y: auto; white-space: pre-wrap; color: var(--text2); line-height: 1.6; }

  /* Summary */
  .summary-content { background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px; font-size: 13px; max-height: 400px; overflow-y: auto; white-space: pre-wrap; }

  /* Delete btn on card */
  .task-delete { color: var(--text3); cursor: pointer; padding: 4px; font-size: 14px; transition: color 0.15s; }
  .task-delete:hover { color: var(--red); }

  /* Task enhancements */
  .task-badge { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 500; }
  .task-badge.project { background: rgba(88,166,255,0.12); color: var(--accent); }
  .task-badge.queue { background: var(--bg4); color: var(--text2); }
  .task-badge.waiting { background: rgba(210,153,34,0.12); color: var(--orange); }
  .task-session { display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--text3); margin-top: 4px; }
  .task-session code { background: var(--bg4); padding: 1px 6px; border-radius: 3px; font-family: 'SF Mono', Monaco, monospace; cursor: pointer; transition: background 0.15s; }
  .task-session code:hover { background: var(--accent); color: #000; }

  /* Project Cards */
  .project-card { background: var(--bg2); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px; margin-bottom: 12px; }
  .project-card.active { border-left: 3px solid var(--green); }
  .project-card.idle { border-left: 3px solid var(--orange); }
  .project-card.complete { border-left: 3px solid var(--accent); }
  .project-card.empty { border-left: 3px solid var(--text3); }
  .project-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 8px; }
  .project-name { font-size: 15px; font-weight: 600; display: flex; align-items: center; gap: 8px; }
  .project-name .activity-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
  .project-desc { font-size: 13px; color: var(--text2); margin-bottom: 10px; }
  .project-meta { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
  .project-meta-tag { display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 4px; font-size: 11px; background: var(--bg3); color: var(--text2); }
  .project-meta-tag.dir { color: var(--accent); background: rgba(88,166,255,0.08); }
  .project-meta-tag.ssh { color: var(--purple); background: rgba(188,140,255,0.08); }
  .project-meta-tag.md { color: var(--orange); background: rgba(210,153,34,0.08); }
  .project-meta-tag.repo { color: var(--green); background: rgba(63,185,80,0.08); }
  .project-tasks { border-top: 1px solid var(--border); padding-top: 10px; }
  .project-tasks h4 { font-size: 12px; font-weight: 500; color: var(--text2); margin-bottom: 6px; }
  .project-task-row { display: flex; align-items: center; gap: 8px; padding: 4px 0; font-size: 12px; }
  .project-task-row .dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
  .project-task-row .dot.pending { background: var(--text3); }
  .project-task-row .dot.running { background: var(--orange); }
  .project-task-row .dot.completed { background: var(--green); }
  .project-task-row .dot.failed { background: var(--red); }
  .project-actions { display: flex; gap: 6px; align-items: center; }
  .project-actions .btn-sm { padding: 2px 8px; font-size: 11px; }
  .add-project-form { background: var(--bg2); border: 1px dashed var(--border); border-radius: var(--radius); padding: 16px; margin-top: 8px; display: none; }
  .add-project-form.open { display: block; }
  .add-project-form input, .add-project-form textarea { width: 100%; background: var(--bg); border: 1px solid var(--border); color: var(--text); padding: 8px 10px; border-radius: 4px; font-size: 13px; font-family: inherit; margin-bottom: 8px; }
  .add-project-form textarea { min-height: 60px; resize: vertical; }
  .unassigned-section { margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--border); }
  .unassigned-section h3 { font-size: 14px; font-weight: 600; color: var(--text2); margin-bottom: 8px; }

  /* Location Cards */
  .loc-group { margin-bottom: 20px; }
  .loc-group h3 { font-size: 13px; font-weight: 600; color: var(--text2); margin-bottom: 8px; display: flex; align-items: center; gap: 8px; }
  .loc-group h3 .count { font-weight: 400; color: var(--text3); }
  .loc-card { background: var(--bg2); border: 1px solid var(--border); border-radius: var(--radius); padding: 12px 16px; margin-bottom: 6px; display: flex; align-items: center; gap: 12px; }
  .loc-card.running { border-left: 3px solid var(--green); }
  .loc-card.idle { border-left: 3px solid var(--text3); }
  .loc-card.archived { border-left: 3px solid var(--text3); opacity: 0.5; }
  .loc-status { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
  .loc-status.running { background: var(--green); box-shadow: 0 0 6px var(--green); }
  .loc-status.idle { background: var(--text3); }
  .loc-status.archived { background: var(--text3); }
  .loc-info { flex: 1; min-width: 0; }
  .loc-title { font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .loc-detail { display: flex; gap: 12px; font-size: 11px; color: var(--text2); margin-top: 2px; flex-wrap: wrap; }
  .loc-detail span { display: inline-flex; align-items: center; gap: 3px; }
  .loc-tags { display: flex; gap: 6px; flex-shrink: 0; flex-wrap: wrap; }
  .loc-tag { padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 500; }
  .loc-tag.model { background: rgba(88,166,255,0.1); color: var(--accent); }
  .loc-tag.perm { background: rgba(63,185,80,0.1); color: var(--green); }
  .loc-tag.status-running { background: rgba(63,185,80,0.15); color: var(--green); }
  .loc-tag.status-idle { background: var(--bg4); color: var(--text3); }

  /* Tab Navigation */
  .tab-bar { display: flex; background: var(--bg2); border-bottom: 1px solid var(--border); padding: 0 24px; gap: 0; overflow-x: auto; -webkit-overflow-scrolling: touch; }
  .tab-btn { padding: 10px 20px; font-size: 13px; font-weight: 500; color: var(--text2); background: none; border: none; border-bottom: 2px solid transparent; cursor: pointer; transition: all 0.15s; white-space: nowrap; font-family: inherit; }
  .tab-btn:hover { color: var(--text); background: var(--bg3); }
  .tab-btn.active { color: var(--accent); border-bottom-color: var(--accent); }
  .tab-btn .tab-badge { display: inline-flex; align-items: center; justify-content: center; min-width: 18px; height: 18px; padding: 0 5px; border-radius: 9px; background: var(--bg4); font-size: 11px; margin-left: 6px; color: var(--text2); }
  .tab-btn.active .tab-badge { background: rgba(88,166,255,0.15); color: var(--accent); }
  .tab-panel { display: none; }
  .tab-panel.active { display: block; }
</style>
</head>
<body>

<div class="header">
  <div class="header-left">
    <h1>AutoClaude</h1>
    <span id="statusBadge" class="status-badge status-WORK"><span class="dot"></span><span id="statusText">WORK</span></span>
    <span id="creditStatus" style="font-size:12px;color:var(--text2)"></span>
  </div>
  <div class="header-controls">
    <div class="time-input"><span>Bed</span><input type="text" id="bedTime" value="23:00" maxlength="5" placeholder="HH:MM" onfocus="this.select()" onblur="validateTime(this)"></div>
    <div class="time-input"><span>Wake</span><input type="text" id="wakeTime" value="07:00" maxlength="5" placeholder="HH:MM" onfocus="this.select()" onblur="validateTime(this)"></div>
    <div class="time-input"><span>Work</span><input type="text" id="workTime" value="09:00" maxlength="5" placeholder="HH:MM" onfocus="this.select()" onblur="validateTime(this)"></div>
    <button id="startStopBtn" class="btn btn-primary" onclick="toggleDaemon()">Start</button>
  </div>
</div>

<div class="tab-bar">
  <button class="tab-btn active" data-tab="tasks" onclick="switchTab('tasks')">Tasks<span id="taskBadge" class="tab-badge">0</span></button>
  <button class="tab-btn" data-tab="projects" onclick="switchTab('projects')">Projects<span id="projectBadge" class="tab-badge">0</span></button>
  <button class="tab-btn" data-tab="locations" onclick="switchTab('locations')">Locations<span id="locationBadge" class="tab-badge">0</span></button>
  <button class="tab-btn" data-tab="usage" onclick="switchTab('usage')">Usage</button>
  <button class="tab-btn" data-tab="permissions" onclick="switchTab('permissions')">Permissions</button>
</div>

<div class="container">
  <!-- Tasks Tab -->
  <div id="tab-tasks" class="tab-panel active">
    <div class="section">
      <div class="section-header open" onclick="toggleSection(this)">
        <h2><span class="chevron">&#9654;</span> Task Queue <span id="taskCount" style="color:var(--text2);font-weight:400"></span></h2>
        <button class="btn btn-sm" onclick="event.stopPropagation();toggleAddForm()">+ Add Task</button>
      </div>
      <div class="section-body open">
        <div id="taskList"></div>
        <div id="addForm" class="add-form">
          <input id="newTitle" placeholder="Task title" />
          <textarea id="newPrompt" placeholder="Detailed prompt / instructions for Claude..."></textarea>
          <div class="form-row">
            <label>Directory</label>
            <input id="newDir" placeholder="/path/to/project" />
          </div>
          <div class="form-row">
            <label>Project</label>
            <select id="newProject"><option value="">— None —</option></select>
          </div>
          <div class="form-row">
            <label>Profile</label>
            <select id="newProfile"></select>
          </div>
          <div class="form-row">
            <label>Sub-agents</label>
            <div class="slider-group">
              <input type="range" id="newSubagent" min="0" max="1" step="0.05" value="0.5" oninput="document.getElementById('newSubagentLabel').textContent=subagentLabel(this.value)">
              <span id="newSubagentLabel" class="slider-label">Moderate</span>
            </div>
          </div>
          <div style="display:flex;gap:8px;justify-content:flex-end">
            <button class="btn" onclick="toggleAddForm()">Cancel</button>
            <button class="btn btn-primary" onclick="addTask()">Add Task</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Activity Log (inside Tasks tab) -->
    <div class="section">
      <div class="section-header" onclick="toggleSection(this)">
        <h2><span class="chevron">&#9654;</span> Activity Log</h2>
      </div>
      <div class="section-body">
        <div id="logOutput" class="log-output">Loading...</div>
      </div>
    </div>

    <!-- Overnight Summary (inside Tasks tab) -->
    <div class="section">
      <div class="section-header" onclick="toggleSection(this)">
        <h2><span class="chevron">&#9654;</span> Overnight Summary</h2>
      </div>
      <div class="section-body">
        <div id="summaryContent" class="summary-content">No summary available yet.</div>
      </div>
    </div>
  </div>

  <!-- Projects Tab -->
  <div id="tab-projects" class="tab-panel">
    <div class="section">
      <div class="section-header open">
        <h2>Projects</h2>
        <button class="btn btn-sm" onclick="toggleProjectForm()">+ New Project</button>
      </div>
      <div class="section-body open">
        <div id="addProjectForm" class="add-project-form">
          <input id="projName" placeholder="Project name" />
          <textarea id="projDesc" placeholder="Description (optional)"></textarea>
          <div class="form-row">
            <label>Main Dir</label>
            <input id="projDir" placeholder="/path/to/project" />
          </div>
          <div class="form-row">
            <label>SSH Locs</label>
            <input id="projSsh" placeholder="user@host:/path, ... (comma-separated)" />
          </div>
          <div class="form-row">
            <label>CLAUDE.md</label>
            <input id="projMd" placeholder="/path/to/CLAUDE.md, ... (comma-separated)" />
          </div>
          <div class="form-row">
            <label>GitHub</label>
            <input id="projRepos" placeholder="owner/repo, ... (comma-separated)" />
          </div>
          <input type="hidden" id="projEditId" value="" />
          <div style="display:flex;gap:8px;justify-content:flex-end">
            <button class="btn" onclick="toggleProjectForm()">Cancel</button>
            <button class="btn btn-primary" onclick="saveProject()">Save Project</button>
          </div>
        </div>
        <div id="projectCards"></div>
        <div id="unassignedTasks" class="unassigned-section" style="display:none"></div>
      </div>
    </div>
  </div>

  <!-- Locations Tab -->
  <div id="tab-locations" class="tab-panel">
    <div class="section">
      <div class="section-header open">
        <h2>Claude Locations <span id="locCount" style="color:var(--text2);font-weight:400;font-size:13px"></span></h2>
        <button class="btn btn-sm" onclick="loadSessions()">Refresh</button>
      </div>
      <div class="section-body open">
        <div id="locationsList"></div>
      </div>
    </div>
  </div>

  <!-- Usage Tab -->
  <div id="tab-usage" class="tab-panel">
    <!-- Connection Status -->
    <div class="section">
      <div class="section-header open">
        <h2>Connection Status</h2>
      </div>
      <div class="section-body open">
        <div id="connectionStatus" style="display:flex;align-items:center;gap:8px;margin-bottom:12px;font-size:13px">
          <span id="connDot" style="width:8px;height:8px;border-radius:50%;background:var(--text3)"></span>
          <span id="connText" style="color:var(--text2)">Not connected</span>
        </div>
        <div class="setup-row" style="margin-top:0">
          <span style="color:var(--text2)">Session Cookie:</span>
          <input type="password" id="sessionKeyInput" placeholder="Paste sessionKey cookie value" />
          <input id="orgIdInput" placeholder="Org ID" style="max-width:200px" />
          <button class="btn btn-sm" onclick="saveApiConfig()">Save</button>
          <button class="btn btn-sm" onclick="refreshUsage()">Refresh</button>
        </div>
      </div>
    </div>

    <!-- Usage Meters -->
    <div class="section">
      <div class="section-header open">
        <h2>Plan Usage</h2>
      </div>
      <div class="section-body open">
        <div id="usageGrid" class="usage-grid"></div>
        <div id="usageChart" class="usage-chart" style="display:none"></div>
      </div>
    </div>

    <!-- Overnight Management -->
    <div class="section">
      <div class="section-header open" onclick="toggleSection(this)">
        <h2><span class="chevron">&#9654;</span> Overnight Management</h2>
      </div>
      <div class="section-body open">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
          <div class="usage-card">
            <h3>Schedule</h3>
            <div style="display:flex;gap:16px;margin-top:8px">
              <div class="time-input"><span>Bed</span><input type="text" id="usageBedTime" value="23:00" maxlength="5" placeholder="HH:MM" onfocus="this.select()" onblur="validateTime(this)"></div>
              <div class="time-input"><span>Wake</span><input type="text" id="usageWakeTime" value="07:00" maxlength="5" placeholder="HH:MM" onfocus="this.select()" onblur="validateTime(this)"></div>
              <div class="time-input"><span>Work</span><input type="text" id="usageWorkTime" value="09:00" maxlength="5" placeholder="HH:MM" onfocus="this.select()" onblur="validateTime(this)"></div>
            </div>
            <button class="btn btn-sm" style="margin-top:8px" onclick="saveScheduleFromUsage()">Update Schedule</button>
          </div>
          <div class="usage-card">
            <h3>Credit Resets</h3>
            <div id="resetTimers" style="font-size:13px;color:var(--text2);margin-top:8px">
              <p>No reset data available</p>
            </div>
          </div>
        </div>
        <div class="usage-card" style="margin-top:16px">
          <h3>Overnight Queue</h3>
          <div id="overnightQueue" style="font-size:13px;color:var(--text2);margin-top:8px">
            <p>No approved tasks in queue</p>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Permissions Tab -->
  <div id="tab-permissions" class="tab-panel">
    <div class="section">
      <div class="section-header open">
        <h2>Permission Profiles</h2>
        <div style="display:flex;gap:6px">
          <button class="btn btn-sm" onclick="createNewProfile()">+ New Profile</button>
          <button class="btn btn-sm" onclick="exportProfiles()">Export</button>
          <button class="btn btn-sm" onclick="document.getElementById('importInput').click()">Import</button>
          <input type="file" id="importInput" accept=".json" style="display:none" onchange="importProfiles(this)" />
        </div>
      </div>
      <div class="section-body open">
        <div id="profileCards"></div>
        <div id="profileEditor" class="profile-editor" style="display:none"></div>
      </div>
    </div>
  </div>
</div>

<script>
const API = '';
let tasks = [];
let profiles = {};
let projects = [];
let activeProfileKey = null;
let dragSrcId = null;

// ─── Tab Navigation ───
function switchTab(tabId) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  const panel = document.getElementById('tab-' + tabId);
  const btn = document.querySelector('.tab-btn[data-tab="' + tabId + '"]');
  if (panel) panel.classList.add('active');
  if (btn) btn.classList.add('active');
  history.replaceState(null, '', '#' + tabId);
}

function initTabFromHash() {
  const hash = location.hash.replace('#', '');
  const validTabs = ['tasks', 'projects', 'locations', 'usage', 'permissions'];
  if (hash && validTabs.includes(hash)) {
    switchTab(hash);
  }
}

function updateTabBadges() {
  const taskBadge = document.getElementById('taskBadge');
  if (taskBadge) taskBadge.textContent = tasks.length;
  const projBadge = document.getElementById('projectBadge');
  if (projBadge) projBadge.textContent = projects.length;
}

// ─── Time Input ───
function validateTime(input) {
  let val = input.value.replace(/[^0-9:]/g, '');
  // Auto-format: "7" → "07:00", "23" → "23:00", "730" → "07:30"
  if (/^\\d{1,2}$/.test(val)) {
    val = val.padStart(2, '0') + ':00';
  } else if (/^\\d{3}$/.test(val)) {
    val = '0' + val[0] + ':' + val.slice(1);
  } else if (/^\\d{4}$/.test(val)) {
    val = val.slice(0, 2) + ':' + val.slice(2);
  }
  const match = val.match(/^(\\d{1,2}):(\\d{2})$/);
  if (match) {
    let h = parseInt(match[1]), m = parseInt(match[2]);
    h = Math.min(23, Math.max(0, h));
    m = Math.min(59, Math.max(0, m));
    input.value = String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
    input.style.borderColor = '';
  } else {
    input.style.borderColor = 'var(--red)';
  }
}

// ─── Helpers ───
function subagentLabel(v) {
  v = parseFloat(v);
  if (v <= 0.05) return 'None';
  if (v <= 0.3) return 'Minimal';
  if (v <= 0.6) return 'Moderate';
  if (v <= 0.85) return 'Heavy';
  return 'Maximum';
}

function usageColor(pct) {
  if (pct >= 90) return 'red';
  if (pct >= 60) return 'orange';
  return 'green';
}

async function api(path, opts = {}) {
  const res = await fetch(API + path, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  return res.json();
}

// ─── Sections ───
function toggleSection(el) {
  el.classList.toggle('open');
  const body = el.nextElementSibling;
  body.classList.toggle('open');
}

// ─── Tasks ───
async function loadTaskList() {
  tasks = await api('/api/tasks');
  tasks.sort((a, b) => (a.order || 0) - (b.order || 0));
  renderTasks();
}

function renderTasks() {
  const list = document.getElementById('taskList');
  const count = document.getElementById('taskCount');
  const pending = tasks.filter(t => t.status === 'pending').length;
  const approved = tasks.filter(t => t.approved && t.status === 'pending').length;
  count.textContent = '(' + approved + ' approved / ' + tasks.length + ' total)';
  updateTabBadges();

  const pendingTasks = tasks.filter(t => t.status === 'pending');
  list.innerHTML = tasks.map((t, idx) => {
    const statusClass = t.status === 'running' ? 'running' : t.status === 'completed' ? 'completed' : t.status === 'failed' ? 'failed' : '';
    const approveClass = t.approved ? 'approved' : 'unapproved';
    const approveText = t.approved ? '\\u2713 Approved' : '\\u2717 Unapproved';

    // Queue position for pending tasks
    const queuePos = t.status === 'pending' ? pendingTasks.indexOf(t) + 1 : 0;
    const queueHtml = queuePos > 0 ? '<span class="task-badge queue">#' + queuePos + ' of ' + pendingTasks.length + '</span>' : '';

    // Project badge
    const proj = t.project ? projects.find(p => p.id === t.project) : null;
    const projectHtml = proj ? '<span class="task-badge project">' + esc(proj.name) + '</span>' : '';

    // Dependency indicator
    const waitingDeps = t.dependencies?.length ? t.dependencies.filter(depId => {
      const dep = tasks.find(x => x.id === depId);
      return dep && dep.status !== 'completed';
    }) : [];
    let depsHtml = '';
    if (t.dependencies?.length) {
      const depNames = t.dependencies.map(depId => {
        const dep = tasks.find(x => x.id === depId);
        const done = dep?.status === 'completed';
        return '<span style="color:' + (done ? 'var(--green)' : 'var(--orange)') + ';cursor:pointer" onclick="event.stopPropagation();removeDep(\\'' + t.id + '\\',\\'' + depId + '\\')" title="Click to remove">' +
          (done ? '\\u2713' : '\\u23f3') + ' ' + esc(dep?.title || 'Unknown') + '</span>';
      });
      depsHtml = '<span class="task-badge waiting" title="' + esc(depNames.length + ' dependencies') + '">' +
        (waitingDeps.length > 0 ? 'Waiting on ' + waitingDeps.length : 'Deps met') +
        '</span>';
    }

    // Session info
    let sessionHtml = '';
    if (t.sessionId) {
      sessionHtml = '<div class="task-session">' +
        '<span>Session:</span>' +
        '<code onclick="copyResume(\\'' + t.sessionId + '\\')" title="Click to copy resume command">' + t.sessionId.slice(0, 8) + '...</code>' +
      '</div>';
    }

    let statsHtml = '';
    if (t.stats) {
      statsHtml = '<div class="stats-row">' +
        '<span>Claude: ' + (t.stats.claudeDirectWork || 0) + ' tool uses</span>' +
        '<span>Sub-agents: ' + (t.stats.subagentCount || 0) + ' (' + Math.round((t.stats.subagentRatio || 0) * 100) + '%)</span>' +
        (t.stats.models?.length ? '<span>Models: ' + t.stats.models.join(', ') + '</span>' : '') +
        '</div>';
      if (t.stats.subagentCalls?.length) {
        statsHtml += '<div class="stats-row" style="flex-direction:column;gap:2px;margin-top:4px">' +
          t.stats.subagentCalls.map(s => '<span style="color:var(--purple)">[' + s.subagentType + '] ' + s.description + ' (' + s.model + ')</span>').join('') +
          '</div>';
      }
    }

    return '<div class="task-card ' + statusClass + '" draggable="true" data-id="' + t.id + '" ' +
      'ondragstart="onDragStart(event)" ondragover="onDragOver(event)" ondrop="onDrop(event)" ondragend="onDragEnd(event)" ondragleave="onDragLeave(event)">' +
      '<div class="drag-handle">\\u2630</div>' +
      '<div class="task-content">' +
        '<div class="task-top">' +
          '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">' +
            '<span class="task-title">' + esc(t.title) + '</span>' +
            queueHtml + projectHtml + depsHtml +
          '</div>' +
          '<div style="display:flex;gap:6px;align-items:center">' +
            '<span class="approve-btn ' + approveClass + '" onclick="toggleApprove(\\'' + t.id + '\\')">' + approveText + '</span>' +
            '<span class="task-delete" onclick="removeTask(\\'' + t.id + '\\')" title="Delete">&times;</span>' +
          '</div>' +
        '</div>' +
        '<div class="task-meta">' +
          '<span>' + esc(t.dir) + '</span>' +
          (t.status !== 'pending' ? '<span style="text-transform:uppercase;color:' + (t.status === 'completed' ? 'var(--green)' : t.status === 'failed' ? 'var(--red)' : 'var(--orange)') + '">' + t.status + '</span>' : '') +
        '</div>' +
        '<div class="task-prompt">' + esc(t.prompt || '') + '</div>' +
        '<div class="task-controls">' +
          '<select onchange="updateTaskField(\\'' + t.id + '\\', \\'project\\', this.value||null)">' +
            '<option value="">— No Project —</option>' +
            projects.map(p => '<option value="' + p.id + '"' + (p.id === t.project ? ' selected' : '') + '>' + esc(p.name) + '</option>').join('') +
          '</select>' +
          '<select onchange="updateTaskField(\\'' + t.id + '\\', \\'permissionProfile\\', this.value)">' +
            Object.keys(profiles).map(k => '<option value="' + k + '"' + (k === t.permissionProfile ? ' selected' : '') + '>' + esc(profiles[k]?.name || k) + '</option>').join('') +
          '</select>' +
          '<div class="slider-group">' +
            '<span style="color:var(--text2)">Sub-agents:</span>' +
            '<input type="range" min="0" max="1" step="0.05" value="' + (t.subagentLevel ?? 0.5) + '" ' +
              'oninput="this.nextElementSibling.textContent=subagentLabel(this.value)" ' +
              'onchange="updateTaskField(\\'' + t.id + '\\', \\'subagentLevel\\', parseFloat(this.value))">' +
            '<span class="slider-label">' + subagentLabel(t.subagentLevel ?? 0.5) + '</span>' +
          '</div>' +
          '<select onchange="addDep(\\'' + t.id + '\\', this.value); this.value=\\'\\';" style="font-size:11px">' +
            '<option value="">+ Dep...</option>' +
            tasks.filter(o => o.id !== t.id && !(t.dependencies || []).includes(o.id)).map(o =>
              '<option value="' + o.id + '">' + esc(o.title) + '</option>'
            ).join('') +
          '</select>' +
        '</div>' +
        (t.dependencies?.length ? '<div class="stats-row" style="margin-top:4px">' +
          t.dependencies.map(depId => {
            const dep = tasks.find(x => x.id === depId);
            const done = dep?.status === 'completed';
            return '<span style="cursor:pointer;color:' + (done ? 'var(--green)' : 'var(--orange)') + '" onclick="removeDep(\\'' + t.id + '\\',\\'' + depId + '\\')" title="Click to remove dependency">' +
              (done ? '\\u2713' : '\\u23f3') + ' ' + esc(dep?.title || 'Unknown') + ' \\u00d7</span>';
          }).join('') + '</div>' : '') +
        sessionHtml +
        statsHtml +
      '</div>' +
    '</div>';
  }).join('');
}

function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

function copyResume(sessionId) {
  navigator.clipboard.writeText('claude --resume ' + sessionId);
  const el = event.target;
  const orig = el.textContent;
  el.textContent = 'Copied!';
  setTimeout(() => { el.textContent = orig; }, 1500);
}

async function toggleApprove(id) {
  const t = tasks.find(x => x.id === id);
  if (!t) return;
  await api('/api/tasks/' + id, { method: 'PUT', body: { approved: !t.approved } });
  loadTaskList();
}

async function updateTaskField(id, field, value) {
  await api('/api/tasks/' + id, { method: 'PUT', body: { [field]: value } });
  loadTaskList();
}

async function removeTask(id) {
  if (!confirm('Delete this task?')) return;
  await api('/api/tasks/' + id, { method: 'DELETE' });
  loadTaskList();
}

async function addDep(taskId, depId) {
  if (!depId) return;
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;
  const deps = [...(task.dependencies || []), depId];
  await api('/api/tasks/' + taskId, { method: 'PUT', body: { dependencies: deps } });
  loadTaskList();
}

async function removeDep(taskId, depId) {
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;
  const deps = (task.dependencies || []).filter(d => d !== depId);
  await api('/api/tasks/' + taskId, { method: 'PUT', body: { dependencies: deps } });
  loadTaskList();
}

function toggleAddForm() {
  document.getElementById('addForm').classList.toggle('open');
}

async function addTask() {
  const title = document.getElementById('newTitle').value.trim();
  const prompt = document.getElementById('newPrompt').value.trim();
  const dir = document.getElementById('newDir').value.trim();
  const project = document.getElementById('newProject').value || null;
  const profile = document.getElementById('newProfile').value;
  const subagentLevel = parseFloat(document.getElementById('newSubagent').value);
  if (!title) return alert('Title required');
  if (!prompt) return alert('Prompt required');
  await api('/api/tasks', { method: 'POST', body: { title, prompt, dir, project, permissionProfile: profile, subagentLevel } });
  document.getElementById('newTitle').value = '';
  document.getElementById('newPrompt').value = '';
  document.getElementById('newDir').value = '';
  toggleAddForm();
  loadTaskList();
}

// ─── Drag & Drop ───
function onDragStart(e) {
  dragSrcId = e.currentTarget.dataset.id;
  e.currentTarget.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
}
function onDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  e.currentTarget.classList.add('drag-over');
}
function onDragLeave(e) { e.currentTarget.classList.remove('drag-over'); }
function onDragEnd(e) {
  e.currentTarget.classList.remove('dragging');
  document.querySelectorAll('.task-card').forEach(c => c.classList.remove('drag-over'));
}
async function onDrop(e) {
  e.preventDefault();
  e.currentTarget.classList.remove('drag-over');
  const targetId = e.currentTarget.dataset.id;
  if (dragSrcId === targetId) return;
  const ids = tasks.map(t => t.id);
  const srcIdx = ids.indexOf(dragSrcId);
  const tgtIdx = ids.indexOf(targetId);
  ids.splice(srcIdx, 1);
  ids.splice(tgtIdx, 0, dragSrcId);
  await api('/api/tasks/reorder', { method: 'PUT', body: { orderedIds: ids } });
  loadTaskList();
}

// ─── Profiles ───
async function loadProfiles() {
  const data = await api('/api/permissions');
  profiles = data.profiles || {};
  renderProfileCards();
  populateProfileDropdowns();
}

const KNOWN_TOOLS = ['Read', 'Edit', 'Write', 'Glob', 'Grep', 'Bash', 'WebFetch', 'WebSearch', 'Task', 'NotebookEdit'];

function renderProfileCards() {
  const container = document.getElementById('profileCards');
  if (!container) return;
  const keys = Object.keys(profiles);
  const config = window._cachedConfig || {};
  const defaultProfile = config.defaultPermissionProfile || 'full-auto';

  container.innerHTML = keys.map(k => {
    const p = profiles[k];
    const usageCount = tasks.filter(t => t.permissionProfile === k).length;
    const isDefault = k === defaultProfile;
    const isSelected = k === activeProfileKey;

    return '<div class="profile-card' + (isSelected ? ' selected' : '') + '" onclick="selectProfile(\\'' + k + '\\')">' +
      '<div class="profile-card-header">' +
        '<div class="profile-card-name">' + esc(p.name || k) +
          (isDefault ? ' <span class="default-badge">Default</span>' : '') +
        '</div>' +
        '<div style="display:flex;gap:6px;align-items:center">' +
          '<span style="font-size:11px;color:var(--text3)">' + usageCount + ' task' + (usageCount !== 1 ? 's' : '') + '</span>' +
          '<button class="btn btn-sm" onclick="event.stopPropagation();duplicateProfile(\\'' + k + '\\')" title="Duplicate">\\ud83d\\udccb</button>' +
          (!isDefault ? '<button class="btn btn-sm" onclick="event.stopPropagation();setDefaultProfile(\\'' + k + '\\')" title="Set as default">\\u2b50</button>' : '') +
        '</div>' +
      '</div>' +
      '<div class="profile-card-desc">' + esc(p.description || '') + '</div>' +
      '<div class="profile-card-meta">' +
        '<span>Mode: ' + esc(p.permissionMode || 'default') + '</span>' +
        (p.dangerouslySkipPermissions ? '<span style="color:var(--orange)">Skip permissions</span>' : '') +
        (p.allowedTools?.length ? '<span style="color:var(--green)">' + p.allowedTools.length + ' allowed</span>' : '') +
        (p.disallowedTools?.length ? '<span style="color:var(--red)">' + p.disallowedTools.length + ' blocked</span>' : '') +
      '</div>' +
    '</div>';
  }).join('');
}

function selectProfile(key) {
  activeProfileKey = key;
  renderProfileCards();
  renderProfileEditor();
}

function renderProfileEditor() {
  const editor = document.getElementById('profileEditor');
  if (!activeProfileKey || !profiles[activeProfileKey]) { editor.style.display = 'none'; return; }
  editor.style.display = 'block';
  const p = profiles[activeProfileKey];
  const modes = ['default','acceptEdits','bypassPermissions','dontAsk','plan'];

  // Build tool tags
  const allowed = new Set(p.allowedTools || []);
  const disallowed = new Set(p.disallowedTools || []);
  const allTools = [...new Set([...KNOWN_TOOLS, ...allowed, ...disallowed])];

  const toolTagsHtml = '<div style="margin-top:4px"><label style="font-size:12px;color:var(--text2);display:block;margin-bottom:4px">Tools <span style="color:var(--text3)">(click to toggle: green=allowed, red=blocked, gray=unset)</span></label>' +
    '<div class="tool-tags">' +
    allTools.map(t => {
      const cls = allowed.has(t) ? 'allowed' : disallowed.has(t) ? 'disallowed' : 'available';
      return '<span class="tool-tag ' + cls + '" onclick="toggleTool(\\'' + esc(t) + '\\')">' + esc(t) + '</span>';
    }).join('') +
    '</div></div>';

  editor.innerHTML =
    '<div class="form-row"><label>Key</label><input value="' + esc(activeProfileKey) + '" disabled /></div>' +
    '<div class="form-row"><label>Name</label><input id="pName" value="' + esc(p.name || '') + '" /></div>' +
    '<div class="form-row"><label>Description</label><input id="pDesc" value="' + esc(p.description || '') + '" /></div>' +
    '<div class="form-row"><label>Mode</label><select id="pMode">' + modes.map(m => '<option' + (m === p.permissionMode ? ' selected' : '') + '>' + m + '</option>').join('') + '</select></div>' +
    '<div class="form-row"><label>Skip Perms</label><input type="checkbox" id="pSkip"' + (p.dangerouslySkipPermissions ? ' checked' : '') + ' /></div>' +
    toolTagsHtml +
    '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px">' +
      '<button class="btn btn-danger btn-sm" onclick="deleteProfile()">Delete</button>' +
      '<button class="btn btn-primary btn-sm" onclick="saveProfile()">Save</button>' +
    '</div>';
}

function toggleTool(toolName) {
  if (!activeProfileKey || !profiles[activeProfileKey]) return;
  const p = profiles[activeProfileKey];
  const allowed = new Set(p.allowedTools || []);
  const disallowed = new Set(p.disallowedTools || []);

  if (allowed.has(toolName)) {
    // allowed → disallowed
    allowed.delete(toolName);
    disallowed.add(toolName);
  } else if (disallowed.has(toolName)) {
    // disallowed → unset
    disallowed.delete(toolName);
  } else {
    // unset → allowed
    allowed.add(toolName);
  }

  p.allowedTools = [...allowed];
  p.disallowedTools = [...disallowed];
  renderProfileEditor();
}

async function saveProfile() {
  const profile = {
    name: document.getElementById('pName').value,
    description: document.getElementById('pDesc').value,
    permissionMode: document.getElementById('pMode').value,
    dangerouslySkipPermissions: document.getElementById('pSkip').checked,
    allowedTools: profiles[activeProfileKey]?.allowedTools || [],
    disallowedTools: profiles[activeProfileKey]?.disallowedTools || [],
  };
  await api('/api/permissions/' + activeProfileKey, { method: 'PUT', body: profile });
  loadProfiles();
}

async function deleteProfile() {
  if (!confirm('Delete profile "' + activeProfileKey + '"?')) return;
  await api('/api/permissions/' + activeProfileKey, { method: 'DELETE' });
  activeProfileKey = null;
  document.getElementById('profileEditor').style.display = 'none';
  loadProfiles();
}

async function createNewProfile() {
  const key = prompt('Profile key (lowercase, no spaces):');
  if (!key) return;
  await api('/api/permissions', { method: 'POST', body: { key, profile: { name: key, description: '', permissionMode: 'default', dangerouslySkipPermissions: false, allowedTools: [], disallowedTools: [] } } });
  activeProfileKey = key;
  loadProfiles();
}

async function duplicateProfile(key) {
  const p = profiles[key];
  if (!p) return;
  const newKey = prompt('New profile key:', key + '-copy');
  if (!newKey) return;
  await api('/api/permissions', { method: 'POST', body: { key: newKey, profile: { ...p, name: (p.name || key) + ' (Copy)' } } });
  activeProfileKey = newKey;
  loadProfiles();
}

async function setDefaultProfile(key) {
  await api('/api/config', { method: 'POST', body: { defaultPermissionProfile: key } });
  window._cachedConfig = window._cachedConfig || {};
  window._cachedConfig.defaultPermissionProfile = key;
  renderProfileCards();
}

function exportProfiles() {
  const data = JSON.stringify({ profiles }, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'autoclaude-permissions.json';
  a.click();
  URL.revokeObjectURL(url);
}

function importProfiles(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const data = JSON.parse(e.target.result);
      const imported = data.profiles || {};
      for (const [key, profile] of Object.entries(imported)) {
        await api('/api/permissions', { method: 'POST', body: { key, profile } });
      }
      loadProfiles();
      alert('Imported ' + Object.keys(imported).length + ' profile(s)');
    } catch (err) {
      alert('Import failed: ' + err.message);
    }
  };
  reader.readAsText(file);
  input.value = '';
}

function populateProfileDropdowns() {
  const selects = [document.getElementById('newProfile')];
  for (const sel of selects) {
    if (!sel) continue;
    sel.innerHTML = Object.keys(profiles).map(k => '<option value="' + k + '">' + esc(profiles[k].name || k) + '</option>').join('');
  }
}

// ─── Projects ───
async function loadProjectsList() {
  projects = await api('/api/projects');
  populateProjectDropdowns();
  renderProjectCards();
}

function populateProjectDropdowns() {
  const sel = document.getElementById('newProject');
  if (!sel) return;
  sel.innerHTML = '<option value="">\\u2014 None \\u2014</option>' +
    projects.map(p => '<option value="' + p.id + '">' + esc(p.name) + '</option>').join('');
}

function toggleProjectForm(editProject) {
  const form = document.getElementById('addProjectForm');
  const editId = document.getElementById('projEditId');
  if (editProject) {
    document.getElementById('projName').value = editProject.name || '';
    document.getElementById('projDesc').value = editProject.description || '';
    document.getElementById('projDir').value = editProject.mainDir || '';
    document.getElementById('projSsh').value = (editProject.sshLocations || []).join(', ');
    document.getElementById('projMd').value = (editProject.claudeMdPaths || []).join(', ');
    document.getElementById('projRepos').value = (editProject.githubRepos || []).join(', ');
    editId.value = editProject.id;
    form.classList.add('open');
  } else if (form.classList.contains('open') && !editId.value) {
    form.classList.remove('open');
  } else {
    document.getElementById('projName').value = '';
    document.getElementById('projDesc').value = '';
    document.getElementById('projDir').value = '';
    document.getElementById('projSsh').value = '';
    document.getElementById('projMd').value = '';
    document.getElementById('projRepos').value = '';
    editId.value = '';
    form.classList.toggle('open');
  }
}

async function saveProject() {
  const name = document.getElementById('projName').value.trim();
  if (!name) return alert('Project name is required');
  const body = {
    name,
    description: document.getElementById('projDesc').value.trim(),
    mainDir: document.getElementById('projDir').value.trim(),
    sshLocations: document.getElementById('projSsh').value.split(',').map(s => s.trim()).filter(Boolean),
    claudeMdPaths: document.getElementById('projMd').value.split(',').map(s => s.trim()).filter(Boolean),
    githubRepos: document.getElementById('projRepos').value.split(',').map(s => s.trim()).filter(Boolean),
  };
  const editId = document.getElementById('projEditId').value;
  if (editId) {
    await api('/api/projects/' + editId, { method: 'PUT', body });
  } else {
    await api('/api/projects', { method: 'POST', body });
  }
  document.getElementById('addProjectForm').classList.remove('open');
  document.getElementById('projEditId').value = '';
  loadProjectsList();
}

async function deleteProject(id) {
  const proj = projects.find(p => p.id === id);
  if (!confirm('Delete project "' + (proj?.name || id) + '"? Tasks will be unassigned.')) return;
  await api('/api/projects/' + id, { method: 'DELETE' });
  loadProjectsList();
  loadTaskList();
}

function renderProjectCards() {
  const container = document.getElementById('projectCards');
  const unassigned = document.getElementById('unassignedTasks');
  if (!container) return;
  updateTabBadges();

  if (projects.length === 0) {
    container.innerHTML = '<div style="color:var(--text2);font-size:13px;padding:24px 0;text-align:center">' +
      '<p style="margin-bottom:8px">No projects configured yet.</p>' +
      '<p style="font-size:12px;color:var(--text3)">Click "+ New Project" to group tasks by codebase.</p></div>';
    unassigned.style.display = 'none';
    return;
  }

  const activityColors = { active: 'var(--green)', idle: 'var(--orange)', complete: 'var(--accent)', empty: 'var(--text3)' };
  const activityLabels = { active: 'Active', idle: 'Idle', complete: 'Complete', empty: 'No tasks' };

  container.innerHTML = projects.map(p => {
    const color = activityColors[p.activityStatus] || 'var(--text3)';
    const label = activityLabels[p.activityStatus] || 'Unknown';
    const ptasks = p.tasks || [];

    // Meta tags
    let metaHtml = '';
    if (p.mainDir) metaHtml += '<span class="project-meta-tag dir">\\ud83d\\udcc1 ' + esc(p.mainDir) + '</span>';
    (p.sshLocations || []).forEach(s => { metaHtml += '<span class="project-meta-tag ssh">\\ud83d\\udd17 ' + esc(s) + '</span>'; });
    (p.claudeMdPaths || []).forEach(m => { metaHtml += '<span class="project-meta-tag md">\\ud83d\\udcdd ' + esc(m.split('/').pop()) + '</span>'; });
    (p.githubRepos || []).forEach(r => {
      const url = r.startsWith('http') ? r : 'https://github.com/' + r;
      const display = r.replace(/^https?:\\/\\/github\\.com\\//, '');
      metaHtml += '<a class="project-meta-tag repo" href="' + esc(url) + '" target="_blank" style="text-decoration:none;cursor:pointer"><svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style="vertical-align:-2px;margin-right:4px"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>' + esc(display) + '</a>';
    });

    // Task list
    let tasksHtml = '';
    if (ptasks.length > 0) {
      const running = ptasks.filter(t => t.status === 'running');
      const pending = ptasks.filter(t => t.status === 'pending');
      const done = ptasks.filter(t => t.status === 'completed');
      const failed = ptasks.filter(t => t.status === 'failed');
      const ordered = [...running, ...pending, ...failed, ...done];
      tasksHtml = '<div class="project-tasks"><h4>' + ptasks.length + ' task' + (ptasks.length !== 1 ? 's' : '') +
        ' \\u2014 ' + running.length + ' running, ' + pending.length + ' pending, ' + done.length + ' done' +
        (failed.length ? ', ' + failed.length + ' failed' : '') + '</h4>' +
        ordered.slice(0, 10).map(t =>
          '<div class="project-task-row">' +
            '<span class="dot ' + t.status + '"></span>' +
            '<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(t.title) + '</span>' +
            (t.approved ? '<span style="color:var(--green);font-size:10px">\\u2713</span>' : '<span style="color:var(--text3);font-size:10px">\\u2717</span>') +
          '</div>'
        ).join('') +
        (ordered.length > 10 ? '<div style="font-size:11px;color:var(--text3);margin-top:4px">+ ' + (ordered.length - 10) + ' more</div>' : '') +
        '</div>';
    }

    return '<div class="project-card ' + p.activityStatus + '">' +
      '<div class="project-header">' +
        '<div class="project-name"><span class="activity-dot" style="background:' + color + '"></span> ' + esc(p.name) + ' <span style="font-size:11px;font-weight:400;color:' + color + '">' + label + '</span></div>' +
        '<div class="project-actions">' +
          '<button class="btn btn-sm" onclick="editProject(\\'' + p.id + '\\')">Edit</button>' +
          '<button class="btn btn-sm btn-danger" onclick="deleteProject(\\'' + p.id + '\\')">\\u00d7</button>' +
        '</div>' +
      '</div>' +
      (p.description ? '<div class="project-desc">' + esc(p.description) + '</div>' : '') +
      (metaHtml ? '<div class="project-meta">' + metaHtml + '</div>' : '') +
      tasksHtml +
    '</div>';
  }).join('');

  // Unassigned tasks section
  const unassignedTasks = tasks.filter(t => !t.project);
  if (unassignedTasks.length > 0) {
    unassigned.style.display = 'block';
    unassigned.innerHTML = '<h3>Unassigned Tasks (' + unassignedTasks.length + ')</h3>' +
      unassignedTasks.map(t =>
        '<div class="project-task-row" style="padding:6px 0">' +
          '<span class="dot ' + t.status + '"></span>' +
          '<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(t.title) + '</span>' +
          '<select style="font-size:11px;padding:2px 6px;background:var(--bg3);border:1px solid var(--border);color:var(--text);border-radius:4px" onchange="assignTaskToProject(\\'' + t.id + '\\', this.value)">' +
            '<option value="">Assign to...</option>' +
            projects.map(p => '<option value="' + p.id + '">' + esc(p.name) + '</option>').join('') +
          '</select>' +
        '</div>'
      ).join('');
  } else {
    unassigned.style.display = 'none';
  }
}

function editProject(id) {
  const proj = projects.find(p => p.id === id);
  if (proj) toggleProjectForm(proj);
}

async function assignTaskToProject(taskId, projectId) {
  await api('/api/tasks/' + taskId, { method: 'PUT', body: { project: projectId || null } });
  loadProjectsList();
  loadTaskList();
}

// ─── Locations (Sessions) ───
let sessions = [];
async function loadSessions() {
  sessions = await api('/api/sessions');
  renderLocations();
}

function renderLocations() {
  const list = document.getElementById('locationsList');
  const countEl = document.getElementById('locCount');
  const badge = document.getElementById('locationBadge');
  if (!list) return;

  const running = sessions.filter(s => s.isRunning && !s.isArchived);
  const recent = sessions.filter(s => !s.isRunning && !s.isArchived);
  const archived = sessions.filter(s => s.isArchived);

  if (badge) badge.textContent = running.length;
  if (countEl) countEl.textContent = '(' + running.length + ' running, ' + sessions.length + ' total)';

  if (sessions.length === 0) {
    list.innerHTML = '<div style="color:var(--text2);font-size:13px;padding:24px 0;text-align:center">' +
      '<p>No Claude Code sessions found.</p>' +
      '<p style="font-size:12px;color:var(--text3);margin-top:4px">Sessions from the Claude Desktop app will appear here.</p></div>';
    return;
  }

  let html = '';

  if (running.length > 0) {
    html += '<div class="loc-group"><h3>\\ud83d\\udfe2 Running <span class="count">(' + running.length + ')</span></h3>' +
      running.map(locCardHtml).join('') + '</div>';
  }

  if (recent.length > 0) {
    html += '<div class="loc-group"><h3>\\u23f8\\ufe0f Recent <span class="count">(' + recent.length + ')</span></h3>' +
      recent.slice(0, 20).map(locCardHtml).join('') +
      (recent.length > 20 ? '<div style="font-size:11px;color:var(--text3);padding:4px 0">+ ' + (recent.length - 20) + ' more</div>' : '') +
      '</div>';
  }

  if (archived.length > 0) {
    html += '<div class="loc-group"><h3>\\ud83d\\udce6 Archived <span class="count">(' + archived.length + ')</span></h3>' +
      archived.slice(0, 10).map(locCardHtml).join('') +
      (archived.length > 10 ? '<div style="font-size:11px;color:var(--text3);padding:4px 0">+ ' + (archived.length - 10) + ' more</div>' : '') +
      '</div>';
  }

  list.innerHTML = html;
}

function locCardHtml(s) {
  const statusClass = s.isRunning ? 'running' : s.isArchived ? 'archived' : 'idle';
  const statusLabel = s.isRunning ? 'Running' : s.isArchived ? 'Archived' : 'Idle';
  const timeAgo = s.lastActivityAt ? relativeTime(s.lastActivityAt) : '';
  const modelShort = (s.model || '').replace('claude-', '').replace(/-/g, ' ');

  return '<div class="loc-card ' + statusClass + '">' +
    '<span class="loc-status ' + statusClass + '"></span>' +
    '<div class="loc-info">' +
      '<div class="loc-title">' + esc(s.title || 'Untitled') + '</div>' +
      '<div class="loc-detail">' +
        '<span>\\ud83d\\udcc1 ' + esc(s.project || 'Unknown') + '</span>' +
        '<span>' + esc(s.cwd || '') + '</span>' +
        (timeAgo ? '<span>' + timeAgo + '</span>' : '') +
      '</div>' +
    '</div>' +
    '<div class="loc-tags">' +
      '<span class="loc-tag status-' + statusClass + '">' + statusLabel + '</span>' +
      (modelShort ? '<span class="loc-tag model">' + esc(modelShort) + '</span>' : '') +
      (s.permissionMode ? '<span class="loc-tag perm">' + esc(s.permissionMode) + '</span>' : '') +
    '</div>' +
  '</div>';
}

function relativeTime(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return mins + 'm ago';
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + 'h ago';
  const days = Math.floor(hrs / 24);
  return days + 'd ago';
}

// ─── Usage Monitor ───
async function loadUsage() {
  const data = await api('/api/usage');
  renderUsage(data);
  renderOvernightQueue();
}

function updateConnectionStatus(data) {
  const dot = document.getElementById('connDot');
  const text = document.getElementById('connText');
  if (!dot || !text) return;

  if (data?.current) {
    dot.style.background = 'var(--green)';
    const ts = data.lastUpdated ? new Date(data.lastUpdated).toLocaleTimeString() : 'just now';
    text.textContent = 'Connected \\u2014 last updated ' + ts;
    text.style.color = 'var(--green)';
  } else {
    dot.style.background = 'var(--red)';
    text.textContent = 'Not connected \\u2014 configure session cookie to enable monitoring';
    text.style.color = 'var(--red)';
  }
}

function renderResetTimers(data) {
  const el = document.getElementById('resetTimers');
  if (!el || !data?.current) return;
  const c = data.current;
  let html = '';
  if (c.fiveHour?.resetsIn) html += '<p>5-Hour Window: resets in <strong>' + c.fiveHour.resetsIn + '</strong></p>';
  if (c.sevenDay?.resetsIn) html += '<p>Weekly Limit: resets in <strong>' + c.sevenDay.resetsIn + '</strong></p>';
  el.innerHTML = html || '<p>No reset data available</p>';
}

function renderOvernightQueue() {
  const el = document.getElementById('overnightQueue');
  if (!el) return;
  const approvedPending = tasks.filter(t => t.approved && t.status === 'pending')
    .sort((a, b) => (a.order || 0) - (b.order || 0));
  if (approvedPending.length === 0) {
    el.innerHTML = '<p>No approved tasks in queue</p>';
    return;
  }
  el.innerHTML = '<ol style="margin:0;padding-left:20px">' +
    approvedPending.map(t => {
      const proj = t.project ? projects.find(p => p.id === t.project) : null;
      return '<li style="margin-bottom:4px">' + esc(t.title) +
        (proj ? ' <span style="color:var(--accent);font-size:11px">[' + esc(proj.name) + ']</span>' : '') +
        ' <span style="color:var(--text3);font-size:11px">' + esc(t.dir) + '</span></li>';
    }).join('') + '</ol>';
}

function saveScheduleFromUsage() {
  const bed = document.getElementById('usageBedTime').value;
  const wake = document.getElementById('usageWakeTime').value;
  const work = document.getElementById('usageWorkTime').value;
  // Sync to header inputs too
  document.getElementById('bedTime').value = bed;
  document.getElementById('wakeTime').value = wake;
  document.getElementById('workTime').value = work;
  api('/api/schedule', { method: 'POST', body: { bedTime: bed, wakeTime: wake, workTime: work } });
}

function renderUsage(data) {
  const grid = document.getElementById('usageGrid');
  updateConnectionStatus(data);
  renderResetTimers(data);
  if (!data || !data.current) {
    grid.innerHTML = '<div class="usage-card"><h3>No usage data</h3><p class="usage-detail">Configure your session cookie to enable monitoring</p></div>';
    return;
  }
  const c = data.current;
  let html = '';

  // 5-hour window
  if (c.fiveHour) {
    html += usageCardHtml('5-Hour Window', c.fiveHour.utilization, c.fiveHour.resetsIn ? 'Resets in ' + c.fiveHour.resetsIn : '');
  }

  // 7-day all models
  if (c.sevenDay) {
    html += usageCardHtml('Weekly (All Models)', c.sevenDay.utilization, c.sevenDay.resetsIn ? 'Resets in ' + c.sevenDay.resetsIn : '');
  }

  // Sonnet
  if (c.sonnet && c.sonnet.utilization !== undefined) {
    html += usageCardHtml('Weekly (Sonnet)', c.sonnet.utilization, '');
  }

  // Extra usage
  if (c.extraUsage) {
    const cur = c.extraUsage.currency || 'AUD';
    const used = (c.extraUsage.used / 100).toFixed(2);
    const limit = (c.extraUsage.limit / 100).toFixed(2);
    html += '<div class="usage-card">' +
      '<h3>Extra Usage</h3>' +
      '<div class="usage-bar"><div class="usage-bar-fill purple" style="width:' + c.extraUsage.percentage + '%"></div></div>' +
      '<div style="display:flex;justify-content:space-between;align-items:baseline">' +
        '<span class="usage-percent">' + c.extraUsage.percentage + '%</span>' +
        '<span class="usage-detail">' + cur + ' $' + used + ' / $' + limit + '</span>' +
      '</div>' +
      (c.prepaid ? '<div class="usage-detail" style="margin-top:4px">Balance: ' + cur + ' $' + (c.prepaid.amount / 100).toFixed(2) + '</div>' : '') +
    '</div>';
  }

  grid.innerHTML = html;

  // Chart
  if (data.graph?.polls?.length > 1) {
    renderUsageChart(data.graph);
  }
}

function usageCardHtml(title, pct, subtitle) {
  const col = usageColor(pct);
  return '<div class="usage-card">' +
    '<h3>' + title + '<span class="usage-detail">' + esc(subtitle) + '</span></h3>' +
    '<div class="usage-bar"><div class="usage-bar-fill ' + col + '" style="width:' + pct + '%"></div></div>' +
    '<span class="usage-percent">' + pct + '%</span>' +
  '</div>';
}

function renderUsageChart(graph) {
  const chart = document.getElementById('usageChart');
  chart.style.display = 'block';
  const polls = graph.polls;
  const events = graph.taskEvents || [];
  if (polls.length < 2) return;

  const w = 600, h = 100, pad = 30;
  const minT = new Date(polls[0].ts).getTime();
  const maxT = new Date(polls[polls.length - 1].ts).getTime();
  const range = maxT - minT || 1;

  const scaleX = (ts) => pad + ((new Date(ts).getTime() - minT) / range) * (w - pad * 2);
  const scaleY = (v) => h - pad + (pad - (h - pad)) * (v / 100);

  let pathD = polls.map((p, i) => (i === 0 ? 'M' : 'L') + scaleX(p.ts).toFixed(1) + ',' + scaleY(p.fiveHr ?? 0).toFixed(1)).join(' ');

  let markers = events.map(e => {
    const x = scaleX(e.ts);
    const color = e.event === 'task_start' ? 'var(--orange)' : 'var(--green)';
    const r = e.event === 'task_start' ? 4 : 3;
    return '<circle cx="' + x.toFixed(1) + '" cy="' + (h / 2) + '" r="' + r + '" fill="' + color + '" />' +
           '<text x="' + x.toFixed(1) + '" y="' + (h / 2 + 14) + '" fill="var(--text3)" font-size="8" text-anchor="middle">' + esc(e.task || '').slice(0, 15) + '</text>';
  }).join('');

  chart.innerHTML = '<svg viewBox="0 0 ' + w + ' ' + (h + 10) + '" xmlns="http://www.w3.org/2000/svg">' +
    '<line x1="' + pad + '" y1="' + (h - pad) + '" x2="' + (w - pad) + '" y2="' + (h - pad) + '" stroke="var(--border)" />' +
    '<line x1="' + pad + '" y1="' + pad + '" x2="' + pad + '" y2="' + (h - pad) + '" stroke="var(--border)" />' +
    '<text x="' + pad + '" y="' + (pad - 5) + '" fill="var(--text3)" font-size="9">100%</text>' +
    '<text x="' + pad + '" y="' + (h - pad + 12) + '" fill="var(--text3)" font-size="9">0%</text>' +
    '<path d="' + pathD + '" fill="none" stroke="var(--accent)" stroke-width="2" />' +
    markers +
  '</svg>';
}

// ─── Status ───
async function loadStatus() {
  const status = await api('/api/status');
  const badge = document.getElementById('statusBadge');
  const text = document.getElementById('statusText');
  const credit = document.getElementById('creditStatus');
  const btn = document.getElementById('startStopBtn');

  const mode = status.schedule?.currentMode || 'WORK';
  badge.className = 'status-badge status-' + mode;
  text.textContent = mode;

  if (status.runner?.isRunning) {
    credit.textContent = 'Running: ' + (status.runner.currentTask || '');
  } else if (status.creditsAvailable) {
    credit.textContent = 'Credits available';
  } else {
    credit.textContent = status.schedule?.running ? 'Waiting for credits...' : '';
  }

  btn.textContent = status.schedule?.running ? 'Stop' : 'Start';
  btn.className = status.schedule?.running ? 'btn btn-danger' : 'btn btn-primary';

  // Populate schedule inputs (header + usage tab)
  if (status.schedule) {
    document.getElementById('bedTime').value = status.schedule.bedTime || '23:00';
    document.getElementById('wakeTime').value = status.schedule.wakeTime || '07:00';
    document.getElementById('workTime').value = status.schedule.workTime || '09:00';
    const ub = document.getElementById('usageBedTime');
    const uw = document.getElementById('usageWakeTime');
    const uwk = document.getElementById('usageWorkTime');
    if (ub) ub.value = status.schedule.bedTime || '23:00';
    if (uw) uw.value = status.schedule.wakeTime || '07:00';
    if (uwk) uwk.value = status.schedule.workTime || '09:00';
  }
}

// ─── Config ───
async function loadApiConfig() {
  const data = await api('/api/config');
  window._cachedConfig = data;
  if (data.claudeApi?.orgId) document.getElementById('orgIdInput').value = data.claudeApi.orgId;
  if (data.claudeApi?.sessionKeySet) document.getElementById('sessionKeyInput').placeholder = 'Cookie saved (hidden)';
}

async function saveApiConfig() {
  const sessionKey = document.getElementById('sessionKeyInput').value.trim();
  const orgId = document.getElementById('orgIdInput').value.trim();
  const body = { claudeApi: {} };
  if (sessionKey) body.claudeApi.sessionKey = sessionKey;
  if (orgId) body.claudeApi.orgId = orgId;
  await api('/api/config', { method: 'POST', body });
  document.getElementById('sessionKeyInput').value = '';
  document.getElementById('sessionKeyInput').placeholder = 'Cookie saved (hidden)';
  refreshUsage();
}

async function refreshUsage() { loadUsage(); }

// ─── Daemon control ───
async function toggleDaemon() {
  const status = await api('/api/status');
  if (status.schedule?.running) {
    await api('/api/daemon/stop', { method: 'POST' });
  } else {
    await api('/api/schedule', { method: 'POST', body: {
      bedTime: document.getElementById('bedTime').value,
      wakeTime: document.getElementById('wakeTime').value,
      workTime: document.getElementById('workTime').value,
    }});
    await api('/api/daemon/start', { method: 'POST' });
  }
  setTimeout(loadStatus, 500);
}

// ─── Log ───
async function loadLog() {
  const lines = await api('/api/log?lines=80');
  document.getElementById('logOutput').textContent = Array.isArray(lines) ? lines.join('\\n') : 'No logs yet';
}

// ─── Summary ───
async function loadSummary() {
  const data = await api('/api/summary');
  document.getElementById('summaryContent').textContent = data.content || 'No summary available yet.';
}

// ─── Server-Sent Events ───
let sseConnected = false;

function connectSSE() {
  const evtSrc = new EventSource('/api/events');
  evtSrc.addEventListener('connected', () => {
    sseConnected = true;
    console.log('SSE connected');
  });
  evtSrc.addEventListener('tasks', (e) => {
    try { tasks = JSON.parse(e.data); renderTasks(); } catch {}
  });
  evtSrc.addEventListener('status', () => {
    loadStatus();
  });
  evtSrc.addEventListener('permissions', (e) => {
    try { permissions = JSON.parse(e.data); renderProfileCards(); } catch {}
  });
  evtSrc.addEventListener('projects', (e) => {
    try { projects = JSON.parse(e.data); renderProjectCards(); } catch {}
  });
  evtSrc.onerror = () => {
    sseConnected = false;
    evtSrc.close();
    // Reconnect after 3s
    setTimeout(connectSSE, 3000);
  };
}

// ─── Init & Polling ───
async function init() {
  initTabFromHash();
  window.addEventListener('hashchange', initTabFromHash);
  await Promise.all([loadStatus(), loadTaskList(), loadProfiles(), loadProjectsList(), loadSessions(), loadApiConfig(), loadUsage(), loadLog(), loadSummary()]);

  // Start SSE for real-time updates
  connectSSE();

  // Fallback polling (slower intervals since SSE handles real-time)
  setInterval(() => { if (!sseConnected) { loadStatus(); loadTaskList(); } }, 5000);
  setInterval(() => { if (!sseConnected) loadProjectsList(); else loadProjectsList(); }, 30000);
  setInterval(loadSessions, 15000);
  setInterval(loadLog, 10000);
  setInterval(loadUsage, 60000);
  // Always poll status every 15s as a safety net even with SSE
  setInterval(loadStatus, 15000);
}

init();
</script>
</body>
</html>`;
}
