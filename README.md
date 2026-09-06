# Adrian Ramos — portfolio

A standalone React + TypeScript + Vite portfolio with a full-viewport Three.js alpine overlook and an animated celestial day/night cycle.

## Run locally

Use Node.js 22 and npm.

```sh
npm ci
npm run dev
```

```sh
npm test
npm run build
npm run preview
```

## Host on GitHub Pages

- Repository: [aiRamo/portfolio](https://github.com/aiRamo/portfolio)
- Website: [airamo.github.io/portfolio](https://airamo.github.io/portfolio/)
- Publish updates by pushing to `main`. The **Deploy portfolio to GitHub Pages** workflow runs automatically, or can be started from the repository's Actions tab.
- Pages uses **GitHub Actions** as its build source. This repository contains the standalone portfolio folder; the parent job-search workspace and its private sources stay outside Git.

The included workflow installs dependencies, runs the geometry/lighting tests, builds the static site, and deploys `dist`. Relative asset paths (`base: './'`) support both project sites and root user sites. No server, database, environment secrets, or paid hosting is required.

See the [official Vite deployment guide](https://vite.dev/guide/static-deploy#github-pages).

## Edit the portfolio

- `src/content.ts`: verified project descriptions, engineering details, email, and profile links.
- `src/App.tsx`: page sections and conceptual project interface studies.
- `src/SectionNavigation.tsx`: name-triggered Work/About/Contact dropdown with keyboard navigation and outside-tap dismissal.
- `src/presentation.ts` and `src/presentationStops.mjs`: responsive navigation selection and desktop section controls. Longer desktop sections use overlapping reading stops; trackpad momentum cannot skip sections.
- `src/freeScroll.ts`: native mobile scrolling, interruptible eased anchor links, and scroll-based activation of the phone and AI diagram.
- `src/styles.css`: responsive layout, typography, theme tokens, and scroll effects.
- `src/Valley.tsx`: React lifecycle and WebGL fallback.
- `src/SceneLoader.tsx` and `src/loader.css`: fullscreen branded progress screen, accessible loading state, and scene-ready reveal.
- `src/createValleyScene.ts`: perspective landscape, continuous terrain, instanced forest, granite outcrops, reflecting tarn, and rotating celestial sphere.
- `src/valleyShaders.ts`: procedural sky/clouds, sun and moon, reflective water, and cinematic finishing.
- `src/granite.ts`: restrained granite grain, mineral veins, crevice shading, and snow-covered shelves.
- `src/cliffs.mjs`: closed cliff masses with recessed joints, bevelled geological planes, and eroded talus geometry.
- `src/catTree.mjs`: faceted bare tree with a black cat on its lower branch and an orange cat reaching down from its upper branch; the roots conform to the left cliff rim.
- `src/landscape.mjs`: a continuous terrain mesh with denser geometry around the observer.
- `src/tundra.ts`: evergreen pine material.
- `src/forest.mjs`: a separate 18-triangle distant pine, terrain-triangle sampling, and deterministic forest groves.
- `src/hero.css`: full-viewport landscape composition and responsive text overlays.
- `src/environment.mjs`: deterministic terrain, observer position, celestial paths, and solar lighting calculations.
- `src/alpine.mjs`: broad distant massifs, carved branching gullies, and terrain-aligned snow accumulation.
- `src/alpineSnow.ts`: cached world-space snow map for detailed, antialiased edges without extra terrain triangles.
- `src/useAtmosphere.ts`: persistent theme preference and continuous sunrise/sunset timeline.
- `src/scrollJourney.mjs`: reversible camera ascent and scroll-linked section entrance calculations.
- `src/useScrollJourney.ts`: native scroll, reading progress, anchor-aware navigation state, and content movement.
- `src/journey.css`: fixed sky backdrop, sticky opening, floating content, and persistent sky controls.
- `src/presentation.css`: isolated slide visibility, reading frames, and presentation spacing.
- `src/AIAdoption.tsx` and `src/adoptionMotion.mjs`: sequential AI adoption diagram, automatically reset between section visits. Three accumulating benefit bullets use bold recipient names and the same eased progress as their matching person's green fill, so text, pause/resume, and replay stay synchronized.
- `src/PhoneShowcase.tsx`, `src/createPhoneScene.ts`, and `src/phoneMotion.mjs`: modeled 3D smartphone with a mock home screen and interruptible app-launch animations. A compact app picker updates app-specific capability/metric bullets beside the phone; mobile uses shorter copy and keeps the phone in the right column. Camera framing fits both viewport dimensions. Original app screenshots and icons are in `public/apps/`; tab content lives in `src/phoneApps.ts`.
- `src/scrollMotion.mjs`: eased document motion shared by section navigation and the camera.
- `src/skyAircraft.ts` and `src/airTraffic.mjs`: distant aircraft, dissipating twin contrails, navigation lights, overlapping arrivals, and continuous visible sky coverage.

## Experience and accessibility

- Theme starts from the device preference and persists locally when storage is available.
- A fullscreen, theme-aware loading screen centers the mountain icon and wordmark above a progress bar. Progress follows completed preparation stages: renderer, terrain, snow material, cliffs, forest, sky, fonts, and the first rendered frame. Heavy setup stages yield so the screen can paint. The loader fades into the scene alone, holds that clear view for 180 ms, then fades the text, navigation, and scroll content in together over 1.1 seconds. Page interaction unlocks when the content begins appearing. Reduced motion uses a 100 ms hold and a gentle 800 ms opacity fade; failed scene downloads or unavailable WebGL reveal the usable portfolio fallback. The scrollbar gutter stays reserved through the reveal so unlocking scrolling cannot resize the scene. Canvas buffers resize only immediately before a redraw, and the loading overlay is removed on its actual fade completion. Setup cancellation releases GPU resources, including during development remounts.
- The scene was rebuilt around the supplied reference's composition: a granite overlook, a close reflective tarn below the observer, pines and rock walls to either side, and distant mountain ranges beyond the opening. The photo is used as composition inspiration; the rendered scene is procedural 3D.
- The opening observer stands 1.8 world units above a continuous foreground ledge and looks slightly down into the view, with subtle eye movement on pointer input. Scrolling through the next 1.2 viewport heights tilts the camera to 82 degrees and raises the viewpoint enough to clear the close cliff rims. Scrolling back retraces the same path.
- The Three.js canvas stays fixed behind the entire page. Content enters only after the ascent has cleared the ground, sun, and moon from the frame. Daytime reading uses a blue gradient and pale cloud wisps; nighttime reading uses stars and softly illuminated clouds. The actual light source projects below the content view, including throughout theme changes. Terrain and the lake's reflection pass are omitted once they are outside the camera view.
- On desktop, the opening landscape scrolls continuously into the first content slide: wheel distance sets a smoothly followed position, touch drags track the finger with a short coast, and keyboard steps move incrementally. Visitors can stop or reverse anywhere along the camera ascent. On reaching the introduction, later gestures advance one content reading stop at a time; leftover wheel momentum cannot skip that first slide. Scrolling back above the introduction restores continuous movement into the landscape. Section links still make deliberate eased jumps. Departing and incoming sections stay visible as they move through the reading frame; menu jumps also show the intervening sections. After arrival, only the current content slide is visible and interactive. Long sections retain overlapping reading stops. The camera follows the same document motion without overshoot. Departing diagrams and phone animations keep their state until arrival, when the new section starts its visit. Reduced motion shortens section jumps while preserving visible movement.
- Compact screens (up to 760px) and touch-first devices use native free scrolling throughout the entire site, including the camera ascent. All content stays in normal document flow, without slide clipping, hidden panels, or gesture interception. Menu links still animate and yield immediately to manual scrolling. The phone and AI diagram activate as their sections enter the reading area, and the diagram resets on a new visit. Navigation mode updates when the viewport or input capabilities change.
- Navigation and the theme toggle remain fixed above the content. A compact sky pause control appears after the ascent; pausing ambient animation still allows scrolling the camera and deliberately changing themes.
- The reading sky always contains at least one visible airliner, including on refresh and when initially paused. Every scene starts with a crossing underway; subsequent planes enter from a side edge. Arrivals aim for 20–32 seconds apart and move earlier when needed to guarantee two seconds of overlapping airframe visibility, with a margin inside the screen edges. Coverage counts actual planes, not lingering contrails. Each crossing takes 36–42 seconds and randomly travels left to right or right to left, rising or descending at varied angles. Route endpoints stay beyond opposite side edges and safely inside the vertical bounds, so no plane enters or exits through the top or bottom. The airframe, lights, engine offsets, and contrail width follow the same direction, including on narrow screens. Finished planes and their wakes release their geometry and materials. The body is barely visible in daylight, with two thin contrails that broaden and disperse behind it. At night, steady red/green position lights, a red beacon, and paired white strobes become visible; their brightness and the trail color follow the existing theme transition. The position-light arrangement follows the [FAA Night Operations guide](https://www.faa.gov/sites/faa.gov/files/Night_Ops_Ch13.pdf); pulse timing is stylized. Flights keep moving with the sky throughout scrolling, even while concealed by the valley-to-sky reveal. Hiding the tab or pausing ambient animation freezes the schedule; an explicit sunrise/sunset also advances aircraft while that sky transition runs. In development, `?flight-preview#work` starts with two opposite-direction crossings underway for visual review; the shortcut is disabled in production.
- Each ordinary theme switch advances the sky by half a day over five seconds: a confident lift followed by a continuous ease to rest, without overshoot or backward movement. The horizon passes through gold, copper, and blue hour. Sun, moon, stars, cloud travel, and page colors all use the same eased celestial phase. Clouds return smoothly to their slow ambient drift, and star trails fade with angular speed. Returning to daylight advances into the next sunrise. Mid-transition toggles continue from the current sky position.
- Distant mountains use connected, broad glacial crests and rounded shoulders, with blue atmospheric depth and warm sunlight. They are generated as continuous terrain rather than individual cone-shaped peaks.
- Alpine snow collects in upper bowls and branching gullies, leaving dark slate ribs exposed. Tributaries merge downhill into narrow, broken remnants above the thawed lower slopes. The geometry and snow share the same drainage structure; a static surface map supplies fine edges independently of mesh spacing. Snow uses the scene's changing sunlight and moonlight, with cool shaded faces and warm sunlit highlights.
- Atmospheric color builds continuously with distance from the overlook. Terrain and forest use the same gradual falloff, with the terrain tint applied after ground-cover shading so no fixed middle/background color boundary appears.
- Dusk, dawn, star visibility, page colors, and lighting derive from the sun's altitude. Water reflects the actual sky and landscape through a planar reflection pass, including moving sun/moon highlights.
- Animation pauses in hidden tabs, and rendering is capped at 30 fps on small screens and 50 fps on larger screens. The persistent sky remains active behind content.
- A visible pause button freezes ambient scene motion and the scrolling text band. Deliberately switching themes still plays the selected transition.
- Clouds drift slowly across the sky and the reflected landscape breaks into visible wind ripples. These intentional environmental movements remain active with reduced motion; the pause button freezes both. Reduced motion still disables pointer drift, scroll reveals, and the moving type band.
- An explicit theme-button press plays sunrise or sunset; the page palette, header, toggle, browser theme color, and project artwork tint use the same solar timeline as the scene.
- The climate is a thawing tundra: slate granite, muted sedge and heather, evergreen pine groves, and irregular snowfields that survive on upper slopes and shelves. Trees have no snow cover. The tarn remains completely melted, with open reflective water and moving ripples.
- Distant forest uses thousands of smaller 18-triangle pines in a single instanced mesh. Groves follow gentle terrain, thin near the snowline and exposed slopes, and fade into irregular clearings. Roots sample the actual terrain triangles, trees remain upright, and their scale and blue atmospheric tint recede with distance. Detailed nearby pines frame the lake; the distant canopy avoids an extra shadow-casting pass.
- Near and middle-distance cliffs use four closed rock masses with broad weathered planes, recessed joints of varying depth, small bevels, and irregular sloping crests. The former scattered wedge outcrops are removed. Terrain spacing tightens to roughly 0.4 units near the observer, with smooth vertex normals and progressively coarser distant geometry. Rockfall gathers at the bases, and nearby trees root to the highest actual rock or terrain surface. The dense distant forest occupies the exposed valleys between the cliffs.
- Cliff geometry was reviewed with a plain gray material before adding the granite finish. In development, append `?clay` to the local URL to inspect the forms without the surface material. The regular scene uses subtle mineral-scale relief, crevice shading, and smooth atmospheric color; distant mountain shoulders remain broad and gently sloped.
- The clifftop cat sculpture appears during the upward camera pan and shares the landscape's changing lighting. Its four static meshes include the forked tree, two cats, and rocky footing. While Vite is running, open `/tools/cat-study.html` to inspect the model with orbit controls; this development study is not included in the production build.
- Keyboard navigation, a skip link, visible focus states, expandable case notes, and working contact/profile links are included.
- A readable fallback is shown if WebGL is unavailable. The rest of the portfolio remains usable.
- Three.js loads in a separate chunk. Fonts are self-hosted, and no analytics or external font requests are used.
- Desktop uses isolated reading slides over the shared sky; mobile uses a continuous page. Project content is finite and unique; the footer scrolls back through the camera journey to the landscape.

## Content provenance

Professional details were drawn from the existing `adrian_ramos_projects_inventory.md` and contact links from `resume_template.tex`, without copying those source files into the public app. Adrian confirmed that the approximately 3,000 monthly active users and $1,500/month in subscription revenue belong to Stalker Sport. Specific Azure compute product names and unconfirmed regulatory claims are omitted.

The smartphone showcase displays original app screenshots and icons supplied by Adrian. SD:Portal's display configuration capabilities are visible in its supplied screenshot; its development ownership and Node.js work come from the inventory. Task Force's four observation fields and two export formats are inventory-supported capability counts, not usage metrics. Work navigation opens the smartphone showcase, followed by AI adoption; the former individual project slides have been removed.

This portfolio is prepared for publishing. No GitHub repository has been created or pushed by the build process.
