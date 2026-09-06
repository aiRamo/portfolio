export const profile = {
  name: 'Adrian Ramos',
  email: 'ramos.aidev@gmail.com',
  github: 'https://github.com/aiRamo',
  linkedin: 'https://linkedin.com/in/Adrian-Ivan-Ramos',
}

export const projects = [
  {
    id: 'streamsense', number: '01', category: 'FIELD SOFTWARE · MOBILE + CLOUD',
    title: 'A clearer picture\nof moving water.', name: 'StreamSense',
    description: 'A field journal that connects river researchers to the data flowing around them. From a radar reading to a place on the map, every observation has a home.',
    tags: ['Flutter', 'Riverpod', 'BLE', 'Mapbox', 'Azure SQL'],
    status: 'In development',
    role: 'Application & backend engineering',
    details: [
      ['The challenge', 'Field observations span sensor recordings, locations, notes, and media. The application brings those pieces together in a map-centered journal for surface velocity radar users.'],
      ['My contribution', 'Designed and implemented the Flutter application and backend, including Riverpod state management, Mapbox interactions, BLE data collection, user management, and historical recording storage in Azure SQL.'],
      ['The engineering', 'Connected live and recorded radar data with site annotations and camera workflows. Integrated the shared cloud-to-phone-to-BLE firmware delivery platform in collaboration with firmware engineers.'],
    ],
  },
  {
    id: 'sport', number: '02', category: 'CONNECTED PRODUCTS · CROSS-PLATFORM',
    title: 'Real-world speed.\nReal-time software.', name: 'Stalker Sport',
    description: 'Turning a radar reading into a useful moment for coaches and athletes. A cross-platform rebuild bringing live telemetry, video, and subscriptions into one experience.',
    tags: ['Flutter', 'BLoC', 'BLE', 'Camera', 'Firebase'],
    status: 'Production', role: 'Primary developer & product owner',
    details: [
      ['The challenge', 'Modernize a legacy iOS sports product while coordinating live radar telemetry, camera and video features, subscriptions, and local persistence.'],
      ['My contribution', 'Rebuilt the application in Flutter with BLoC to coordinate device connections and product workflows across iOS and Android. Owned signing, provisioning, store releases, and ongoing maintenance.'],
      ['The engineering', 'Integrated BLE speed data with camera workflows and overlays. Added Firebase Analytics and Crashlytics to support behavior analysis and remote crash debugging for a product used by sports consumers, including professional baseball organizations.'],
    ],
  },
  {
    id: 'redminex', number: '03', category: 'DEVELOPER EXPERIENCE · AUTOMATION',
    title: 'Less release friction.\nMore room to build.', name: 'RedmineX',
    description: 'Better tools for the people building the tools. An internal project platform with shared MCP infrastructure and a release process that gets out of the way.',
    tags: ['Ruby on Rails', 'MCP', 'GitLab CI/CD', 'Agentic AI'],
    status: 'Internal platform', role: 'Primary developer & platform owner',
    details: [
      ['The challenge', 'An internal Redmine-based project platform needed more capable workflows and a repeatable release process. Deployments previously consumed approximately a full day.'],
      ['My contribution', 'Introduced the first CI/CD process for QA and production, reducing the release procedure to less than one hour. Streamlined project-management features and owned ongoing platform development.'],
      ['The engineering', 'Built an MCP server and supporting integrations that let compatible AI tools read, edit, and add project content. Created shared infrastructure for teams, with agentic workflows supporting documentation and engineering handoffs.'],
    ],
  },
]

export const fieldNotes = [
  { number: '01', title: 'From cloud to the physical world', text: 'Designed the mobile side of a firmware delivery pipeline: Azure Blob Storage to a phone, then over BLE to devices without a network connection.', tags: 'System design / BLE / OTA' },
  { number: '02', title: 'A sensor is only the beginning', text: 'Connected radar and LIDAR readings to camera capture and YOLO-based vehicle detection in Task Force, with local storage and CSV/PDF export.', tags: 'Flutter / Computer vision / Native integration' },
  { number: '03', title: 'Make the platform work for people', text: 'Recreated the Stalker Sport developer service with FastAPI, Docker, API-key access, Stripe subscriptions, and mobile SDK and REST integration paths.', tags: 'FastAPI / Azure / Developer platforms' },
  { number: '04', title: 'One codebase, a wider reach', text: 'Introduced Flutter as the primary mobile architecture and consolidated three native applications, with platform channels wherever native capabilities mattered.', tags: 'Architecture / Flutter / iOS + Android' },
]
