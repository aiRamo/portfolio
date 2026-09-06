const asset = (name: string) => `${import.meta.env.BASE_URL}apps/${name}.png`
export const phoneApps = [
  {
    id: 'stalker-sport', name: 'Stalker Sport', short: 'Sport', category: 'SPORTS RADAR',
    description: 'Connected radar for coaches, athletes, and professional baseball organizations.',
    screenshot: asset('stalker-sport'), icon: asset('stalker-sport-icon'), color: '#e63736',
    capabilities: [
      { title: '~3,000 monthly active users', detail: 'Combined across iOS and Android.', compact: '~3K monthly active users' },
      { title: '~$1,500 / month', detail: 'Subscription revenue from paid app features.', compact: '~$1.5K/mo in subscriptions' },
      { title: 'Live radar + video', detail: 'Real-time BLE speed telemetry, camera capture, and video overlays.', compact: 'Live radar + video overlays' },
      { title: 'iOS + Android', detail: 'Rebuilt the legacy iOS app in Flutter, with BLoC coordinating device data and app state.', compact: 'iOS + Android, built in Flutter' },
    ],
  },
  {
    id: 'task-force', name: 'Stalker Task Force', short: 'Task Force', category: 'TRAFFIC ENFORCEMENT',
    description: 'Connecting radar, LIDAR, and computer vision to field data collection.',
    screenshot: asset('task-force'), icon: asset('task-force-icon'), color: '#ee4639',
    capabilities: [
      { title: 'Sensor-triggered vision', detail: 'Radar/LIDAR readings trigger camera capture; YOLO identifies the associated vehicle.', compact: 'Radar + AI vehicle capture' },
      { title: '4 observation fields', detail: 'Vehicle type, speed, distance, and direction, alongside a locally stored image.', compact: 'Type, speed, distance + direction' },
      { title: '2 export formats', detail: 'CSV and PDF exports for collected traffic observations.', compact: 'CSV + PDF exports' },
      { title: 'Control + firmware updates', detail: 'BLE remote-control protocols and over-the-air updates for connected hardware.', compact: 'BLE control + firmware updates' },
    ],
  },
  {
    id: 'sd-portal', name: 'SD:Portal', short: 'SD:Portal', category: 'ROADSIDE DISPLAYS',
    description: 'Roadside display setup, with the controls right in your hand.',
    screenshot: asset('sd-portal'), icon: asset('sd-portal-icon'), color: '#6daee9',
    capabilities: [
      { title: 'Speed + alert displays', detail: 'Configure speed-limit and speed-alert display settings.', compact: 'Speed + alert display setup' },
      { title: 'Graphics + strobes', detail: 'Choose sign graphics and strobe alert actions.', compact: 'Sign graphics + strobe alerts' },
      { title: 'Save + upload', detail: 'Save a setup and upload its configuration to the selected device.', compact: 'Save + upload to the device' },
      { title: 'End-to-end ownership', detail: 'Primary developer across architecture, testing, deployment, and maintenance, including Node.js services.', compact: 'Primary developer, end to end' },
    ],
  },
]
