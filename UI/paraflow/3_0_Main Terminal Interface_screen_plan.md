## Main Terminal Interface
The central hub for SSH connections, providing configuration, terminal interaction, and integrated AI assistance, designed with a dark theme, rounded corners, and semi-transparent elements.
Layout Hierarchy:
- Header (Full-width):
  - Top Navigation Bar
- Content Container (Positioned below the header):
  - Left Sidebar
  - Main Content Area
  - Right Sidebar

### Top Navigation Bar
Displays the application logo and title ("Web SSH Terminal Pro"), the current connection status (e.g., 'Connected', 'Disconnected', 'Connecting' with a visual indicator), and global action buttons including a settings icon (for accessing application settings) and a toggle button for the AI Assistant panel.

### Left Sidebar (Connection Configuration & Saved Connections Quick Access)
Provides input fields for configuring new SSH connections, including Server Address, Port, Username, a checkbox for Proxy Connection (with expandable fields for proxy details if checked), and a dropdown for Authentication Methods (Password, Key). It includes primary "Connect" and "Disconnect" action buttons. Below the configuration, a section labeled "Saved Connections" displays a scrollable list of frequently used server profiles, with an option or button to "Manage All" saved connections.

### Main Content Area (Terminal Display)
Serves as the interactive SSH terminal. This area displays the command output from the connected server and allows for user input. It includes a subtle terminal header that may contain the current session name or tab and minimal controls like a clear screen button.

### Right Sidebar (AI Assistant Panel)
A collapsible and expandable panel integrated into the main interface. When expanded, it displays a chat-like interface. This panel allows users to input queries for the AI assistant, which then provides command suggestions, explanations, and code snippets relevant to SSH or Linux. The panel supports code highlighting and includes a one-click copy functionality for suggested content. When collapsed, it might appear as a narrow vertical tab or icon.