import * as THREE from 'three'
import { phoneApps } from './phoneApps'

export const iconXs = [155, 380, 605], iconY = 690, iconSize = 140
type Images = { screen: HTMLImageElement; icon: HTMLImageElement }[]

/** Paint each piece once. The GPU composes and animates them without texture uploads. */
export function createPhoneScreen(renderer: THREE.WebGLRenderer, images: Images) {
  const textures: THREE.CanvasTexture[] = []
  function artwork(paint: (ctx: CanvasRenderingContext2D) => void, width = 900, height = 1920) {
    const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height
    const context = canvas.getContext('2d')!
    paint(context)
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy())
    textures.push(texture)
    return texture
  }
  const rounded = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r) }
  const home = artwork(ctx => {
    const gradient = ctx.createLinearGradient(0, 0, 900, 1920)
    gradient.addColorStop(0, '#153d55'); gradient.addColorStop(.5, '#244b60'); gradient.addColorStop(1, '#12202f')
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, 900, 1920)
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = ['#52717c', '#385d6b', '#234353', '#193342'][i]
      ctx.beginPath(); ctx.moveTo(-50, 1500 + i * 55)
      ctx.bezierCurveTo(120, 950 + i * 135, 270, 1410, 430, 1130 + i * 120)
      ctx.bezierCurveTo(590, 920 + i * 160, 660, 1290, 950, 1080 + i * 175)
      ctx.lineTo(950, 1950); ctx.lineTo(-50, 1950); ctx.fill()
    }
    ctx.textAlign = 'center'; ctx.fillStyle = '#f5f7f4'
    ctx.font = '500 100px sans-serif'; ctx.fillText('9:41', 450, 355)
    ctx.font = '30px sans-serif'; ctx.fillText('Built for the world outside.', 450, 419)
    phoneApps.forEach((app, i) => {
      ctx.font = '25px sans-serif'; ctx.fillStyle = '#fff'; ctx.fillText(app.short, iconXs[i] + 70, iconY + 185)
    })
    ctx.fillStyle = '#ffffff19'; rounded(ctx, 190, 1680, 520, 100, 50); ctx.fill()
    ctx.font = '25px sans-serif'; ctx.fillStyle = '#e1ecee'; ctx.fillText('Three apps. One connected world.', 450, 1741)
  })
  const icons = artwork(ctx => images.forEach((image, i) => ctx.drawImage(image.icon, i * 256, 0, 256, 256)), 768, 256)
  const apps = images.map(({ screen }, index) => artwork(ctx => {
    ctx.fillStyle = ['#ffffff', '#1e1e1e', '#131b22'][index]; ctx.fillRect(0, 0, 900, 1920)
    const fit = Math.min(900 / screen.width, 1770 / screen.height)
    ctx.drawImage(screen, (900 - screen.width * fit) / 2, 108 + (1770 - screen.height * fit) / 2, screen.width * fit, screen.height * fit)
  }))
  const chrome = artwork(ctx => {
    ctx.fillStyle = '#ffffff'; ctx.textAlign = 'left'; ctx.font = 'bold 24px sans-serif'; ctx.fillText('9:41', 65, 75)
    ctx.fillRect(754, 53, 9, 18); ctx.fillRect(768, 47, 9, 24); ctx.fillRect(782, 40, 9, 31)
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; rounded(ctx, 812, 45, 45, 23, 5); ctx.stroke(); ctx.fillRect(818, 51, 30, 11)
    rounded(ctx, 315, 1896, 270, 8, 4); ctx.fill()
  })
  const material = new THREE.ShaderMaterial({
    toneMapped: false,
    uniforms: { home: { value: home }, icons: { value: icons }, app: { value: apps[0] }, chrome: { value: chrome },
      selected: { value: -1 }, windowIndex: { value: 0 }, progress: { value: -1 }, tap: { value: 0 },
      foreground: { value: new THREE.Color('#f6f8f9') } },
    vertexShader: `varying vec2 screenUV; void main(){screenUV=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `
      uniform sampler2D home,icons,app,chrome;
      uniform float selected,windowIndex,progress,tap;
      uniform vec3 foreground;
      varying vec2 screenUV;
      float roundedMask(vec2 point,vec2 origin,vec2 size,float radius){
        vec2 q=abs(point-origin-size*.5)-(size*.5-radius);
        float d=length(max(q,0.))+min(max(q.x,q.y),0.)-radius;
        float aa=max(.5,fwidth(d));return 1.-smoothstep(-aa,aa,d);
      }
      void main(){
        vec2 p=vec2(screenUV.x,1.-screenUV.y)*vec2(900.,1920.);
        vec3 color;
        if(progress>=1.) { color=texture2D(app,screenUV).rgb; }
        else {
        color=texture2D(home,screenUV).rgb;
        for(int i=0;i<3;i++){
          float index=float(i),left=155.+index*225.;
          float pulse=abs(selected-index)<.5?sin(tap*3.14159265):0.;
          float size=140.*(1.-pulse*.1);
          vec2 origin=vec2(left,690.)+(140.-size)*.5;
          vec2 uv=clamp((p-origin)/size,0.,1.);
          vec4 icon=texture2D(icons,vec2((index+uv.x)/3.,1.-uv.y));
          color=mix(color,icon.rgb,icon.a*roundedMask(p,origin,vec2(size),32.*size/140.));
          float distance=length(p-vec2(left+70.,760.)),aa=max(.5,fwidth(distance));
          float ring=1.-smoothstep(2.-aa,2.+aa,abs(distance-(82.+tap*32.)));
          color=mix(color,vec3(1.),ring*pulse*.85);
          float spot=1.-smoothstep(28.-aa,28.+aa,distance);
          color=mix(color,vec3(1.),spot*pulse*.4);
        }
        if(progress>=0.){
          vec2 origin=vec2(155.+windowIndex*225.,690.)*(1.-progress);
          vec2 size=mix(vec2(140.),vec2(900.,1920.),progress);
          vec2 uv=clamp((p-origin)/size,0.,1.);
          color=mix(color,texture2D(app,vec2(uv.x,1.-uv.y)).rgb,roundedMask(p,origin,size,34.*(1.-progress)));
        }
        }
        color=mix(color,foreground,texture2D(chrome,screenUV).a);
        gl_FragColor=vec4(color,1.);
        #include <colorspace_fragment>
      }`,
  })
  return {
    material,
    update(selected: number, index: number, progress: number, tap: number, light: boolean) {
      material.uniforms.selected.value = selected
      material.uniforms.windowIndex.value = Math.max(0, index)
      material.uniforms.app.value = apps[Math.max(0, index)]
      material.uniforms.progress.value = progress
      material.uniforms.tap.value = tap
      material.uniforms.foreground.value.set(light ? '#15212a' : '#f6f8f9')
    },
    async prepare(signal: AbortSignal) {
      // Spread the one-time uploads across tasks; interactions never re-upload these canvases.
      for (const texture of textures) {
        signal.throwIfAborted(); renderer.initTexture(texture)
        await new Promise(resolve => setTimeout(resolve, 0))
      }
      signal.throwIfAborted()
    },
    dispose() { textures.forEach(texture => texture.dispose()); material.dispose() },
  }
}
