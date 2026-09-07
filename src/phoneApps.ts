const asset = (name: string) => `${import.meta.env.BASE_URL}apps/${name}.png`
export const phoneApps = [
  {
    id: 'stalker-sport', name: 'Stalker Sport', short: 'Stalker Sport', category: 'SPORTS RADAR',
    description: 'I modernized a legacy app into a commercial cross-platform product with real users and real revenue.',
    screenshot: asset('stalker-sport'), icon: asset('stalker-sport-icon'), color: '#e63736',
    capabilities: [
      { title: 'Cross-platform architecture', detail: 'Rebuilt the iOS app in Flutter for shared iOS and Android development.', compact: 'Cross-platform architecture' },
      { title: 'Complex integrations', detail: 'Brought Bluetooth hardware, real-time data, video, and subscriptions together through BLoC state management.', compact: 'Complex integrations' },
      { title: 'Production ownership', detail: 'Manage releases, analytics, and crash investigation for roughly 3,000 monthly active users.', compact: 'Production ownership' },
    ],
  },
  {
    id: 'task-force', name: 'Stalker Task Force', short: 'Task Force', category: 'TRAFFIC ENFORCEMENT',
    description: 'I turn complex hardware and software requirements into a working mobile product.',
    screenshot: asset('task-force'), icon: asset('task-force-icon'), color: '#ee4639',
    capabilities: [
      { title: 'Systems integration', detail: 'Connect Flutter, native platform code, Bluetooth devices, and computer vision.', compact: 'Systems integration' },
      { title: 'Performance engineering', detail: 'Use native integrations where camera workflows need greater efficiency.', compact: 'Performance engineering' },
      { title: 'Technical ownership', detail: 'Coordinate with product, firmware, and QA teams from integration planning through release.', compact: 'Technical ownership' },
    ],
  },
  {
    id: 'sd-portal', name: 'SD:Portal', short: 'SD:Portal', category: 'ROADSIDE DISPLAYS',
    description: 'I work across application and service boundaries to keep a product moving from idea to release.',
    screenshot: asset('sd-portal'), icon: asset('sd-portal-icon'), color: '#6daee9',
    capabilities: [
      { title: 'Broad engineering ownership', detail: 'Contribute across architecture, application development, and supporting services.', compact: 'Broad engineering ownership' },
      { title: 'Practical backend development', detail: 'Use Node.js as part of the product’s implementation.', compact: 'Practical backend development' },
      { title: 'Long-term accountability', detail: 'Own both shipping the software and maintaining it after launch.', compact: 'Long-term accountability' },
    ],
  },
]
