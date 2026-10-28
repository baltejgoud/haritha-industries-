import{$ as e,A as t,Cn as n,E as r,En as i,F as a,Fn as o,G as s,H as c,In as l,L as u,Ln as d,R as f,Sn as p,T as m,V as h,Vn as ee,W as te,Z as ne,_ as re,_n as ie,a as ae,at as oe,bn as se,et as g,ft as ce,g as le,ht as ue,i as _,j as de,l as fe,ln as v,o as pe,r as y,vn as b,vt as me,yt as he}from"./three-core-DhSSFWwJ.js";import{n as x,r as S}from"./three-renderer-CAFfyXjy.js";var ge=new y,C=new l,w=class extends u{constructor(){super(),this.isLineSegmentsGeometry=!0,this.type=`LineSegmentsGeometry`,this.setIndex([0,2,1,2,3,1,2,4,3,4,5,3,4,6,5,6,7,5]),this.setAttribute(`position`,new de([-1,2,0,1,2,0,-1,1,0,1,1,0,-1,0,0,1,0,0,-1,-1,0,1,-1,0],3)),this.setAttribute(`uv`,new de([-1,2,1,2,-1,1,1,1,-1,-1,1,-1,-1,-2,1,-2],2))}applyMatrix4(e){let t=this.attributes.instanceStart,n=this.attributes.instanceEnd;return t!==void 0&&(t.applyMatrix4(e),n.applyMatrix4(e),t.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}setPositions(e){let t;e instanceof Float32Array?t=e:Array.isArray(e)&&(t=new Float32Array(e));let n=new f(t,6,1);return this.setAttribute(`instanceStart`,new h(n,3,0)),this.setAttribute(`instanceEnd`,new h(n,3,3)),this.instanceCount=this.attributes.instanceStart.count,this.computeBoundingBox(),this.computeBoundingSphere(),this}setColors(e){let t;e instanceof Float32Array?t=e:Array.isArray(e)&&(t=new Float32Array(e));let n=new f(t,6,1);return this.setAttribute(`instanceColorStart`,new h(n,3,0)),this.setAttribute(`instanceColorEnd`,new h(n,3,3)),this}fromWireframeGeometry(e){return this.setPositions(e.attributes.position.array),this}fromEdgesGeometry(e){return this.setPositions(e.attributes.position.array),this}fromMesh(e){return this.fromWireframeGeometry(new ee(e.geometry)),this}fromLineSegments(e){let t=e.geometry;return this.setPositions(t.attributes.position.array),this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new y);let e=this.attributes.instanceStart,t=this.attributes.instanceEnd;e!==void 0&&t!==void 0&&(this.boundingBox.setFromBufferAttribute(e),ge.setFromBufferAttribute(t),this.boundingBox.union(ge))}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new se),this.boundingBox===null&&this.computeBoundingBox();let e=this.attributes.instanceStart,t=this.attributes.instanceEnd;if(e!==void 0&&t!==void 0){let n=this.boundingSphere.center;this.boundingBox.getCenter(n);let r=0;for(let i=0,a=e.count;i<a;i++)C.fromBufferAttribute(e,i),r=Math.max(r,n.distanceToSquared(C)),C.fromBufferAttribute(t,i),r=Math.max(r,n.distanceToSquared(C));this.boundingSphere.radius=Math.sqrt(r),isNaN(this.boundingSphere.radius)&&console.error(`THREE.LineSegmentsGeometry.computeBoundingSphere(): Computed radius is NaN. The instanced position data is likely to have NaN values.`,this)}}toJSON(){}};S.line={worldUnits:{value:1},linewidth:{value:1},resolution:{value:new o(1,1)},dashOffset:{value:0},dashScale:{value:1},dashSize:{value:1},gapSize:{value:1}},x.line={uniforms:i.merge([S.common,S.fog,S.line]),vertexShader:`
		#include <common>
		#include <color_pars_vertex>
		#include <fog_pars_vertex>
		#include <logdepthbuf_pars_vertex>
		#include <clipping_planes_pars_vertex>

		uniform float linewidth;
		uniform vec2 resolution;

		attribute vec3 instanceStart;
		attribute vec3 instanceEnd;

		attribute vec3 instanceColorStart;
		attribute vec3 instanceColorEnd;

		#ifdef WORLD_UNITS

			varying vec4 worldPos;
			varying vec3 worldStart;
			varying vec3 worldEnd;

			#ifdef USE_DASH

				varying vec2 vUv;

			#endif

		#else

			varying vec2 vUv;

		#endif

		#ifdef USE_DASH

			uniform float dashScale;
			attribute float instanceDistanceStart;
			attribute float instanceDistanceEnd;
			varying float vLineDistance;

		#endif

		void trimSegment( const in vec4 start, inout vec4 end ) {

			// trim end segment so it terminates between the camera plane and the near plane

			// conservative estimate of the near plane
			float a = projectionMatrix[ 2 ][ 2 ]; // 3nd entry in 3th column
			float b = projectionMatrix[ 3 ][ 2 ]; // 3nd entry in 4th column
			float nearEstimate = - 0.5 * b / a;

			float alpha = ( nearEstimate - start.z ) / ( end.z - start.z );

			end.xyz = mix( start.xyz, end.xyz, alpha );

		}

		void main() {

			#ifdef USE_COLOR

				vColor.xyz = ( position.y < 0.5 ) ? instanceColorStart : instanceColorEnd;

			#endif

			#ifdef USE_DASH

				vLineDistance = ( position.y < 0.5 ) ? dashScale * instanceDistanceStart : dashScale * instanceDistanceEnd;
				vUv = uv;

			#endif

			float aspect = resolution.x / resolution.y;

			// camera space
			vec4 start = modelViewMatrix * vec4( instanceStart, 1.0 );
			vec4 end = modelViewMatrix * vec4( instanceEnd, 1.0 );

			#ifdef WORLD_UNITS

				worldStart = start.xyz;
				worldEnd = end.xyz;

			#else

				vUv = uv;

			#endif

			// special case for perspective projection, and segments that terminate either in, or behind, the camera plane
			// clearly the gpu firmware has a way of addressing this issue when projecting into ndc space
			// but we need to perform ndc-space calculations in the shader, so we must address this issue directly
			// perhaps there is a more elegant solution -- WestLangley

			bool perspective = ( projectionMatrix[ 2 ][ 3 ] == - 1.0 ); // 4th entry in the 3rd column

			if ( perspective ) {

				if ( start.z < 0.0 && end.z >= 0.0 ) {

					trimSegment( start, end );

				} else if ( end.z < 0.0 && start.z >= 0.0 ) {

					trimSegment( end, start );

				}

			}

			// clip space
			vec4 clipStart = projectionMatrix * start;
			vec4 clipEnd = projectionMatrix * end;

			// ndc space
			vec3 ndcStart = clipStart.xyz / clipStart.w;
			vec3 ndcEnd = clipEnd.xyz / clipEnd.w;

			// direction
			vec2 dir = ndcEnd.xy - ndcStart.xy;

			// account for clip-space aspect ratio
			dir.x *= aspect;
			dir = normalize( dir );

			#ifdef WORLD_UNITS

				vec3 worldDir = normalize( end.xyz - start.xyz );
				vec3 tmpFwd = normalize( mix( start.xyz, end.xyz, 0.5 ) );
				vec3 worldUp = normalize( cross( worldDir, tmpFwd ) );
				vec3 worldFwd = cross( worldDir, worldUp );
				worldPos = position.y < 0.5 ? start: end;

				// height offset
				float hw = linewidth * 0.5;
				worldPos.xyz += position.x < 0.0 ? hw * worldUp : - hw * worldUp;

				// don't extend the line if we're rendering dashes because we
				// won't be rendering the endcaps
				#ifndef USE_DASH

					// cap extension
					worldPos.xyz += position.y < 0.5 ? - hw * worldDir : hw * worldDir;

					// add width to the box
					worldPos.xyz += worldFwd * hw;

					// endcaps
					if ( position.y > 1.0 || position.y < 0.0 ) {

						worldPos.xyz -= worldFwd * 2.0 * hw;

					}

				#endif

				// project the worldpos
				vec4 clip = projectionMatrix * worldPos;

				// shift the depth of the projected points so the line
				// segments overlap neatly
				vec3 clipPose = ( position.y < 0.5 ) ? ndcStart : ndcEnd;
				clip.z = clipPose.z * clip.w;

			#else

				vec2 offset = vec2( dir.y, - dir.x );
				// undo aspect ratio adjustment
				dir.x /= aspect;
				offset.x /= aspect;

				// sign flip
				if ( position.x < 0.0 ) offset *= - 1.0;

				// endcaps
				if ( position.y < 0.0 ) {

					offset += - dir;

				} else if ( position.y > 1.0 ) {

					offset += dir;

				}

				// adjust for linewidth
				offset *= linewidth;

				// adjust for clip-space to screen-space conversion // maybe resolution should be based on viewport ...
				offset /= resolution.y;

				// select end
				vec4 clip = ( position.y < 0.5 ) ? clipStart : clipEnd;

				// back to clip space
				offset *= clip.w;

				clip.xy += offset;

			#endif

			gl_Position = clip;

			vec4 mvPosition = ( position.y < 0.5 ) ? start : end; // this is an approximation

			#include <logdepthbuf_vertex>
			#include <clipping_planes_vertex>
			#include <fog_vertex>

		}
		`,fragmentShader:`
		uniform vec3 diffuse;
		uniform float opacity;
		uniform float linewidth;

		#ifdef USE_DASH

			uniform float dashOffset;
			uniform float dashSize;
			uniform float gapSize;

		#endif

		varying float vLineDistance;

		#ifdef WORLD_UNITS

			varying vec4 worldPos;
			varying vec3 worldStart;
			varying vec3 worldEnd;

			#ifdef USE_DASH

				varying vec2 vUv;

			#endif

		#else

			varying vec2 vUv;

		#endif

		#include <common>
		#include <color_pars_fragment>
		#include <fog_pars_fragment>
		#include <logdepthbuf_pars_fragment>
		#include <clipping_planes_pars_fragment>

		vec2 closestLineToLine(vec3 p1, vec3 p2, vec3 p3, vec3 p4) {

			float mua;
			float mub;

			vec3 p13 = p1 - p3;
			vec3 p43 = p4 - p3;

			vec3 p21 = p2 - p1;

			float d1343 = dot( p13, p43 );
			float d4321 = dot( p43, p21 );
			float d1321 = dot( p13, p21 );
			float d4343 = dot( p43, p43 );
			float d2121 = dot( p21, p21 );

			float denom = d2121 * d4343 - d4321 * d4321;

			float numer = d1343 * d4321 - d1321 * d4343;

			mua = numer / denom;
			mua = clamp( mua, 0.0, 1.0 );
			mub = ( d1343 + d4321 * ( mua ) ) / d4343;
			mub = clamp( mub, 0.0, 1.0 );

			return vec2( mua, mub );

		}

		void main() {

			float alpha = opacity;
			vec4 diffuseColor = vec4( diffuse, alpha );

			#include <clipping_planes_fragment>

			#ifdef USE_DASH

				if ( vUv.y < - 1.0 || vUv.y > 1.0 ) discard; // discard endcaps

				if ( mod( vLineDistance + dashOffset, dashSize + gapSize ) > dashSize ) discard; // todo - FIX

			#endif

			#ifdef WORLD_UNITS

				// Find the closest points on the view ray and the line segment
				vec3 rayEnd = normalize( worldPos.xyz ) * 1e5;
				vec3 lineDir = worldEnd - worldStart;
				vec2 params = closestLineToLine( worldStart, worldEnd, vec3( 0.0, 0.0, 0.0 ), rayEnd );

				vec3 p1 = worldStart + lineDir * params.x;
				vec3 p2 = rayEnd * params.y;
				vec3 delta = p1 - p2;
				float len = length( delta );
				float norm = len / linewidth;

				#ifndef USE_DASH

					#ifdef USE_ALPHA_TO_COVERAGE

						float dnorm = fwidth( norm );
						alpha = 1.0 - smoothstep( 0.5 - dnorm, 0.5 + dnorm, norm );

					#else

						if ( norm > 0.5 ) {

							discard;

						}

					#endif

				#endif

			#else

				#ifdef USE_ALPHA_TO_COVERAGE

					// artifacts appear on some hardware if a derivative is taken within a conditional
					float a = vUv.x;
					float b = ( vUv.y > 0.0 ) ? vUv.y - 1.0 : vUv.y + 1.0;
					float len2 = a * a + b * b;
					float dlen = fwidth( len2 );

					if ( abs( vUv.y ) > 1.0 ) {

						alpha = 1.0 - smoothstep( 1.0 - dlen, 1.0 + dlen, len2 );

					}

				#else

					if ( abs( vUv.y ) > 1.0 ) {

						float a = vUv.x;
						float b = ( vUv.y > 0.0 ) ? vUv.y - 1.0 : vUv.y + 1.0;
						float len2 = a * a + b * b;

						if ( len2 > 1.0 ) discard;

					}

				#endif

			#endif

			#include <logdepthbuf_fragment>
			#include <color_fragment>

			gl_FragColor = vec4( diffuseColor.rgb, alpha );

			#include <tonemapping_fragment>
			#include <colorspace_fragment>
			#include <fog_fragment>
			#include <premultiplied_alpha_fragment>

		}
		`};var _e=class extends ie{constructor(e){super({type:`LineMaterial`,uniforms:i.clone(x.line.uniforms),vertexShader:x.line.vertexShader,fragmentShader:x.line.fragmentShader,clipping:!0}),this.isLineMaterial=!0,this.setValues(e)}get color(){return this.uniforms.diffuse.value}set color(e){this.uniforms.diffuse.value=e}get worldUnits(){return`WORLD_UNITS`in this.defines}set worldUnits(e){e===!0!==this.worldUnits&&(this.needsUpdate=!0),e===!0?this.defines.WORLD_UNITS=``:delete this.defines.WORLD_UNITS}get linewidth(){return this.uniforms.linewidth.value}set linewidth(e){this.uniforms.linewidth&&(this.uniforms.linewidth.value=e)}get dashed(){return`USE_DASH`in this.defines}set dashed(e){e===!0!==this.dashed&&(this.needsUpdate=!0),e===!0?this.defines.USE_DASH=``:delete this.defines.USE_DASH}get dashScale(){return this.uniforms.dashScale.value}set dashScale(e){this.uniforms.dashScale.value=e}get dashSize(){return this.uniforms.dashSize.value}set dashSize(e){this.uniforms.dashSize.value=e}get dashOffset(){return this.uniforms.dashOffset.value}set dashOffset(e){this.uniforms.dashOffset.value=e}get gapSize(){return this.uniforms.gapSize.value}set gapSize(e){this.uniforms.gapSize.value=e}get opacity(){return this.uniforms.opacity.value}set opacity(e){this.uniforms&&(this.uniforms.opacity.value=e)}get resolution(){return this.uniforms.resolution.value}set resolution(e){this.uniforms.resolution.value.copy(e)}get alphaToCoverage(){return`USE_ALPHA_TO_COVERAGE`in this.defines}set alphaToCoverage(e){this.defines&&(e===!0!==this.alphaToCoverage&&(this.needsUpdate=!0),e===!0?this.defines.USE_ALPHA_TO_COVERAGE=``:delete this.defines.USE_ALPHA_TO_COVERAGE)}},T=new d,ve=new l,ye=new l,E=new d,D=new d,O=new d,k=new l,A=new e,j=new te,M=new l,N=new y,P=new se,F=new d,I,L;function R(e,t,n){return F.set(0,0,-t,1).applyMatrix4(e.projectionMatrix),F.multiplyScalar(1/F.w),F.x=L/n.width,F.y=L/n.height,F.applyMatrix4(e.projectionMatrixInverse),F.multiplyScalar(1/F.w),Math.abs(Math.max(F.x,F.y))}function be(e,t){let n=e.matrixWorld,r=e.geometry,i=r.attributes.instanceStart,a=r.attributes.instanceEnd,o=Math.min(r.instanceCount,i.count);for(let r=0,s=o;r<s;r++){j.start.fromBufferAttribute(i,r),j.end.fromBufferAttribute(a,r),j.applyMatrix4(n);let o=new l,s=new l;I.distanceSqToSegment(j.start,j.end,s,o),s.distanceTo(o)<L*.5&&t.push({point:s,pointOnLine:o,distance:I.origin.distanceTo(s),object:e,face:null,faceIndex:r,uv:null,uv1:null})}}function xe(e,t,n){let r=t.projectionMatrix,i=e.material.resolution,a=e.matrixWorld,o=e.geometry,s=o.attributes.instanceStart,c=o.attributes.instanceEnd,u=Math.min(o.instanceCount,s.count),d=-t.near;I.at(1,O),O.w=1,O.applyMatrix4(t.matrixWorldInverse),O.applyMatrix4(r),O.multiplyScalar(1/O.w),O.x*=i.x/2,O.y*=i.y/2,O.z=0,k.copy(O),A.multiplyMatrices(t.matrixWorldInverse,a);for(let t=0,o=u;t<o;t++){if(E.fromBufferAttribute(s,t),D.fromBufferAttribute(c,t),E.w=1,D.w=1,E.applyMatrix4(A),D.applyMatrix4(A),E.z>d&&D.z>d)continue;if(E.z>d){let e=E.z-D.z,t=(E.z-d)/e;E.lerp(D,t)}else if(D.z>d){let e=D.z-E.z,t=(D.z-d)/e;D.lerp(E,t)}E.applyMatrix4(r),D.applyMatrix4(r),E.multiplyScalar(1/E.w),D.multiplyScalar(1/D.w),E.x*=i.x/2,E.y*=i.y/2,D.x*=i.x/2,D.y*=i.y/2,j.start.copy(E),j.start.z=0,j.end.copy(D),j.end.z=0;let o=j.closestPointToPointParameter(k,!0);j.at(o,M);let u=ne.lerp(E.z,D.z,o),f=u>=-1&&u<=1,p=k.distanceTo(M)<L*.5;if(f&&p){j.start.fromBufferAttribute(s,t),j.end.fromBufferAttribute(c,t),j.start.applyMatrix4(a),j.end.applyMatrix4(a);let r=new l,i=new l;I.distanceSqToSegment(j.start,j.end,i,r),n.push({point:i,pointOnLine:r,distance:I.origin.distanceTo(i),object:e,face:null,faceIndex:t,uv:null,uv1:null})}}}var Se=class extends g{constructor(e=new w,t=new _e({color:Math.random()*16777215})){super(e,t),this.isLineSegments2=!0,this.type=`LineSegments2`}computeLineDistances(){let e=this.geometry,t=e.attributes.instanceStart,n=e.attributes.instanceEnd,r=new Float32Array(2*t.count);for(let e=0,i=0,a=t.count;e<a;e++,i+=2)ve.fromBufferAttribute(t,e),ye.fromBufferAttribute(n,e),r[i]=i===0?0:r[i-1],r[i+1]=r[i]+ve.distanceTo(ye);let i=new f(r,2,1);return e.setAttribute(`instanceDistanceStart`,new h(i,1,0)),e.setAttribute(`instanceDistanceEnd`,new h(i,1,1)),this}raycast(e,t){let n=this.material.worldUnits,r=e.camera;r===null&&!n&&console.error(`LineSegments2: "Raycaster.camera" needs to be set in order to raycast against LineSegments2 while worldUnits is set to false.`);let i=e.params.Line2===void 0?0:e.params.Line2.threshold||0;I=e.ray;let a=this.matrixWorld,o=this.geometry,s=this.material;L=s.linewidth+i,o.boundingSphere===null&&o.computeBoundingSphere(),P.copy(o.boundingSphere).applyMatrix4(a);let c;if(c=n?L*.5:R(r,Math.max(r.near,P.distanceToPoint(I.origin)),s.resolution),P.radius+=c,I.intersectsSphere(P)===!1)return;o.boundingBox===null&&o.computeBoundingBox(),N.copy(o.boundingBox).applyMatrix4(a);let l;l=n?L*.5:R(r,Math.max(r.near,N.distanceToPoint(I.origin)),s.resolution),N.expandByScalar(l),I.intersectsBox(N)!==!1&&(n?be(this,t):xe(this,r,t))}onBeforeRender(e){let t=this.material.uniforms;t&&t.resolution&&(e.getViewport(T),this.material.uniforms.resolution.value.set(T.z,T.w))}},z=1e4;function Ce({paper:e,ink:t,axis:n=[1,0,0]}){return{uPaper:{value:B(e)},uInk:{value:B(t)},uGlow:{value:new l(1,.52,.16)},uAxis:{value:new l(...n)},uFront:{value:-z},uBand:{value:.55},uHeat:{value:0},uDraw:{value:z},uErase:{value:-z},uLineOpacity:{value:1}}}function B(e){return new l((e>>16&255)/255,(e>>8&255)/255,(e&255)/255)}var V=`
  uniform vec3 uAxis;
  uniform float uFront, uBand, uHeat, uDraw, uErase, uLineOpacity;
  uniform vec3 uPaper, uInk, uGlow;
  varying float vSweep;
`;function we(e,t={}){let n=new oe({color:t.color??10238760,roughness:t.roughness??.6,metalness:t.metalness??.18,polygonOffset:!0,polygonOffsetFactor:1,polygonOffsetUnits:1});return n.onBeforeCompile=t=>{Object.assign(t.uniforms,e),t.vertexShader=t.vertexShader.replace(`#include <common>`,`#include <common>\n${V}`).replace(`#include <begin_vertex>`,`#include <begin_vertex>
vSweep = dot(position, uAxis);`),t.fragmentShader=t.fragmentShader.replace(`#include <common>`,`#include <common>\n${V}`).replace(`#include <dithering_fragment>`,`#include <dithering_fragment>
        if (vSweep > uDraw || vSweep < uErase) discard;
        float solid = 1.0 - smoothstep(uFront - 0.012, uFront + 0.012, vSweep);
        float behind = max(uFront - vSweep, 0.0);
        float hz = 1.0 - clamp(behind / uBand, 0.0, 1.0);
        float heat = solid * hz * hz * uHeat;
        vec3 hot = mix(vec3(0.42, 0.06, 0.02), uGlow, hz * hz);
        vec3 metal = mix(gl_FragColor.rgb, gl_FragColor.rgb * 0.35 + hot * 1.45, heat);
        float seam = (1.0 - smoothstep(0.0, 0.03, abs(vSweep - uFront))) * uHeat;
        metal += vec3(1.0, 0.86, 0.6) * seam;
        gl_FragColor.rgb = mix(uPaper, metal, solid);`)},n.customProgramCacheKey=()=>`draft-fill`,n}function Te(e,t,n=1.25){return new ie({side:1,transparent:!0,depthWrite:!1,uniforms:{...e,uWidth:{value:n},uRes:{value:t}},vertexShader:`
      ${V}
      uniform float uWidth;
      uniform vec2 uRes;
      void main() {
        vSweep = dot(position, uAxis);
        vec4 clip = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        vec3 viewNormal = normalize(normalMatrix * normal);
        vec2 dir = (projectionMatrix * vec4(viewNormal, 0.0)).xy;
        float len = length(dir);
        if (len > 1e-5) clip.xy += (dir / len) * uWidth * 2.0 / uRes * clip.w;
        gl_Position = clip;
      }`,fragmentShader:`
      ${V}
      void main() {
        if (vSweep > uDraw || vSweep < uErase) discard;
        float solid = 1.0 - smoothstep(uFront - 0.04, uFront + 0.04, vSweep);
        float alpha = uLineOpacity * (1.0 - solid);
        if (alpha < 0.01) discard;
        gl_FragColor = vec4(uInk, alpha);
      }`})}function Ee(e,t,n={}){let r=new _e({color:n.color??1315860,linewidth:n.width??1.2,transparent:!0,opacity:n.opacity??1,depthWrite:!1,dashed:!1});r.resolution=t;let i=n.followFront??!0;return r.onBeforeCompile=t=>{Object.assign(t.uniforms,e),t.vertexShader=t.vertexShader.replace(`#include <common>`,`#include <common>\n${V}`).replace(`void main() {`,`void main() {
vSweep = dot(( position.y < 0.5 ) ? instanceStart : instanceEnd, uAxis);`),t.fragmentShader=t.fragmentShader.replace(`#include <common>`,`#include <common>\n${V}`).replace(`gl_FragColor = vec4( diffuseColor.rgb, alpha );`,`if (vSweep > uDraw || vSweep < uErase) discard;
        float solid = ${i?`1.0 - smoothstep(uFront - 0.04, uFront + 0.04, vSweep)`:`0.0`};
        gl_FragColor = vec4( diffuseColor.rgb, alpha * uLineOpacity * (1.0 - solid) );`)},r.customProgramCacheKey=()=>`draft-pen-`+(i?`f`:`s`),r}function De(e,t){let n=new w;return n.setPositions(e),new Se(n,t)}function Oe(e,t=!1){let n=e[0].index!==null,r=new Set(Object.keys(e[0].attributes)),i=new Set(Object.keys(e[0].morphAttributes)),a={},o={},s=e[0].morphTargetsRelative,c=new pe,l=0;for(let u=0;u<e.length;++u){let d=e[u],f=0;if(n!==(d.index!==null))return console.error(`THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index `+u+`. All geometries must have compatible attributes; make sure index attribute exists among all geometries, or in none of them.`),null;for(let e in d.attributes){if(!r.has(e))return console.error(`THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index `+u+`. All geometries must have compatible attributes; make sure "`+e+`" attribute exists among all geometries, or in none of them.`),null;a[e]===void 0&&(a[e]=[]),a[e].push(d.attributes[e]),f++}if(f!==r.size)return console.error(`THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index `+u+`. Make sure all geometries have the same number of attributes.`),null;if(s!==d.morphTargetsRelative)return console.error(`THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index `+u+`. .morphTargetsRelative must be consistent throughout all geometries.`),null;for(let e in d.morphAttributes){if(!i.has(e))return console.error(`THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index `+u+`.  .morphAttributes must be consistent throughout all geometries.`),null;o[e]===void 0&&(o[e]=[]),o[e].push(d.morphAttributes[e])}if(t){let e;if(n)e=d.index.count;else if(d.attributes.position!==void 0)e=d.attributes.position.count;else return console.error(`THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index `+u+`. The geometry must have either an index or a position attribute`),null;c.addGroup(l,e,u),l+=e}}if(n){let t=0,n=[];for(let r=0;r<e.length;++r){let i=e[r].index;for(let e=0;e<i.count;++e)n.push(i.getX(e)+t);t+=e[r].attributes.position.count}c.setIndex(n)}for(let e in a){let t=ke(a[e]);if(!t)return console.error(`THREE.BufferGeometryUtils: .mergeGeometries() failed while trying to merge the `+e+` attribute.`),null;c.setAttribute(e,t)}for(let e in o){let t=o[e][0].length;if(t===0)break;c.morphAttributes=c.morphAttributes||{},c.morphAttributes[e]=[];for(let n=0;n<t;++n){let t=[];for(let r=0;r<o[e].length;++r)t.push(o[e][r][n]);let r=ke(t);if(!r)return console.error(`THREE.BufferGeometryUtils: .mergeGeometries() failed while trying to merge the `+e+` morphAttribute.`),null;c.morphAttributes[e].push(r)}}return c}function ke(e){let t,n,r,i=-1,a=0;for(let o=0;o<e.length;++o){let s=e[o];if(t===void 0&&(t=s.array.constructor),t!==s.array.constructor)return console.error(`THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.array must be of consistent array types across matching attributes.`),null;if(n===void 0&&(n=s.itemSize),n!==s.itemSize)return console.error(`THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.itemSize must be consistent across matching attributes.`),null;if(r===void 0&&(r=s.normalized),r!==s.normalized)return console.error(`THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.normalized must be consistent across matching attributes.`),null;if(i===-1&&(i=s.gpuType),i!==s.gpuType)return console.error(`THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.gpuType must be consistent across matching attributes.`),null;a+=s.count*n}let o=new t(a),s=new ae(o,n,r),c=0;for(let t=0;t<e.length;++t){let r=e[t];if(r.isInterleavedBufferAttribute){let e=c/n;for(let t=0,i=r.count;t<i;t++)for(let i=0;i<n;i++){let n=r.getComponent(t,i);s.setComponent(t+e,i,n)}}else o.set(r.array,c);c+=r.count*n}return i!==void 0&&(s.gpuType=i),s}var H=new l(0,1,0),U=(e,t,n)=>new l(e,t,n),W=Math.PI*2,G=class{constructor(){this.parts=[],this.lines=[],this.anchors=[]}add(e,{kind:t=`body`,edges:n=!0,hull:r=!0,threshold:i=28}={}){if(e.deleteAttribute(`uv`),n){let t=new m(e,i),n=t.attributes.position.array;for(let e=0;e<n.length;e++)this.lines.push(n[e]);t.dispose()}let a=e.index?e.toNonIndexed():e;return this.parts.push({geometry:a,kind:t,hull:r}),this}seg(e,t){this.lines.push(e.x,e.y,e.z,t.x,t.y,t.z)}circle(e,t,n,r=56){let[i,a]=Ae(t),o;for(let t=0;t<=r;t++){let s=t/r*W,c=e.clone().addScaledVector(i,Math.cos(s)*n).addScaledVector(a,Math.sin(s)*n);o&&this.seg(o,c),o=c}}chain(e,t,n=.26,r=.06,i=.04){let a=t.clone().sub(e),o=a.length();a.normalize();let s=0,c=!0;for(;s<o;){let t=Math.min(c?n:i,o-s);this.seg(e.clone().addScaledVector(a,s),e.clone().addScaledVector(a,s+t)),s+=t+r,c=!c}}hatch(e,t,n,r,i,a,o=1){for(let s=e-r*o-i;s<t-n*o+i;s+=i){let i=[];for(let a of[n,r]){let n=s+a*o;n>=e&&n<=t&&i.push([n,a])}for(let a of[e,t]){let e=(a-s)/o;e>n&&e<r&&i.push([a,e])}i.length>=2&&this.seg(a(...i[0]),a(...i[1]))}}anchor(e,t){this.anchors.push({name:e,position:t.clone()})}};function Ae(e){let t=e.clone().normalize(),n=Math.abs(t.y)<.9?H:U(1,0,0),r=new l().crossVectors(t,n).normalize();return[r,new l().crossVectors(t,r).normalize()]}function K(e,t,n){let r=new he().setFromUnitVectors(H,n.clone().normalize());return e.applyQuaternion(r),e.translate(t.x,t.y,t.z),e}var q=(e,t,n=!1,r=40)=>new re(e,e,t,r,1,n).translate(0,t/2,0);function J(e,t,n=56,r=16){let i=[];for(let n=0;n<=r;n++){let a=n/r*(Math.PI/2);i.push(new o(Math.max(e*Math.cos(a),8e-4),t*Math.sin(a)))}return new c(i,n)}function Y(e,t,n,{r,len:i,fr:a,ft:o=.05,blind:s=!1,bolts:c=8}){n=n.clone().normalize(),e.add(K(q(r,i+.08,!1,28),t.clone().addScaledVector(n,-.08),n)),e.add(K(q(a,o,!1,44),t.clone().addScaledVector(n,i-o),n));let l=t.clone().addScaledVector(n,i);s&&(e.add(K(q(a,o*.9,!1,44),l,n)),l.addScaledVector(n,o*.9));let[u,d]=Ae(n),f=(a+r)/2+.008;for(let r=0;r<c;r++){let a=r/c*W+.3,l=t.clone().addScaledVector(n,i-o-.025).addScaledVector(u,Math.cos(a)*f).addScaledVector(d,Math.sin(a)*f);e.add(K(q(.013,o+(s?o:0)+.05,!1,6),l,n),{kind:`dark`,edges:!1,hull:!1})}return l}function X(e,t,n,r,i={}){e.add(K(q(t,r-n,!0,72),U(n,0,0),U(1,0,0)),i)}function Z(e,t,n,r){e.add(K(J(t,t/2),U(n,0,0),U(r,0,0)))}function Q(e,t,n){let r=new p(t+.004,.009,6,96).rotateY(Math.PI/2).translate(n,0,0);e.add(r,{edges:!1,hull:!1})}function $(e,n,r,i,a,o=.06){let s=-r-a,c=Math.PI*7/6,l=Math.PI*11/6,u=new b;u.moveTo(-i/2,s),u.lineTo(i/2,s),u.lineTo(r*Math.cos(l),r*Math.sin(l)),u.absarc(0,0,r,l,c,!0),u.lineTo(-i/2,s);let d=new t(u,{depth:o,bevelEnabled:!1,curveSegments:36});d.translate(0,0,-o/2).rotateY(Math.PI/2).translate(n,0,0),e.add(d,{kind:`dark`});let f=new b,p=Math.max(.3,r*.55),m=p*.6;return f.moveTo(-p/2,s),f.lineTo(p/2,s),f.lineTo(m/2,-r+.012),f.lineTo(-m/2,-r+.012),f.lineTo(-p/2,s),e.add(new t(f,{depth:.04,bevelEnabled:!1}).translate(n,0,-.02),{kind:`dark`}),e.add(new _(p+.06,.04,i*1.08).translate(n,s-.02,0),{kind:`dark`}),s-.04}function je(e,n,r,{w:i=.26,h:a=.24,t:o=.045,hole:s=.045}={}){let c=new b;c.moveTo(-i/2,0),c.lineTo(i/2,0),c.lineTo(i/2,a-i/2),c.absarc(0,a-i/2,i/2,0,Math.PI,!1),c.lineTo(-i/2,0);let l=new ce;l.absarc(0,a-i/2,s,0,W,!0),c.holes.push(l);let u=new t(c,{depth:o,bevelEnabled:!1,curveSegments:20});e.add(u.translate(n,r,-o/2))}function Me(){let e=new G,t=.8,n=4.6;X(e,t,-n/2,n/2),Z(e,t,n/2,1),Z(e,t,-n/2,-1),Q(e,t,-n/2+n/3),Q(e,t,-n/2+2*n/3);let r=Y(e,U(-1.3,t,0),H,{r:.1,len:.44,fr:.2}),i=Y(e,U(.95,t,0),H,{r:.15,len:.44,fr:.27,bolts:10});Y(e,U(.2,t,0),H,{r:.06,len:.36,fr:.13,bolts:6}),Y(e,U(0,-t,0),U(0,-1,0),{r:.07,len:.22,fr:.14,bolts:6});let a=Y(e,U(n/2+t/2-.02,0,0),U(1,0,0),{r:.09,len:.3,fr:.18}),o=Y(e,U(-.45,0,t-.02),U(0,0,1),{r:.3,len:.24,fr:.42,ft:.06,blind:!0,bolts:16});e.add(new _(.06,.16,.2).translate(.02999999999999997,0,t+.12),{kind:`dark`});let s=Math.min($(e,-1.6,t,1.45,.36),$(e,1.6,t,1.45,.36));return je(e,-1.95,t-.04),je(e,1.95,t-.04),e.add(new _(.36,.22,.016).translate(1.05,-.12,t-.002),{kind:`dark`}),e.anchor(`Shell`,U(-1.1,t*.5,t*.866)),e.anchor(`Dished head`,U(n/2+.3,.34,.34)),e.anchor(`Nozzle`,i),e.anchor(`Manway`,o),e.anchor(`Saddle support`,U(1.6,-t-.18,.62)),e.meta={R:t,L:n,ground:s,n1:r,n2:i,n5:a,m1:o},e}function Ne(e){let t=new G,{R:n,L:r,ground:i,n5:a}=e,o=1.68,s=(e,n,r)=>{let i=e.clone().addScaledVector(n,.13);t.seg(e,i.clone().addScaledVector(r,.045)),t.seg(e,i.clone().addScaledVector(r,-.045))};t.seg(U(-r/2,n+.1,0),U(-r/2,o+.1,0)),t.seg(U(r/2,n+.1,0),U(r/2,o+.1,0)),t.seg(U(-r/2,o,0),U(r/2,o,0)),s(U(-r/2,o,0),U(1,0,0),H),s(U(r/2,o,0),U(-1,0,0),H);let c=-r/2-n/2-.5;t.seg(U(-r/2-.05,n,0),U(c-.1,n,0)),t.seg(U(-r/2-.05,-n,0),U(c-.1,-n,0)),t.seg(U(c,-n,0),U(c,n,0)),s(U(c,n,0),U(0,-1,0),U(1,0,0)),s(U(c,-n,0),U(0,1,0),U(1,0,0));let l=U(a.x+.32,.72,0);t.seg(a.clone().add(U(.02,.1,0)),l),t.seg(l,l.clone().add(U(1,0,0))),t.chain(U(-r/2-n/2-.35,0,0),U(a.x+.35,0,0)),t.chain(U(-1.6,i-.25,0),U(-1.6,n+.25,0)),t.chain(U(1.6,i-.25,0),U(1.6,n+.25,0)),t.seg(U(-3.1,i,0),U(3.1,i,0));for(let e=-3;e<=3.05;e+=.16)t.seg(U(e,i,0),U(e-.1,i-.1,0));return{lines:t.lines,labels:{length:U(0,o,0),diameter:U(c,0,0),nozzle:l.clone()}}}function Pe(){let e=new G,t=.72,n=3.4,r=.12,i=.045,a=-.85,o=.55;X(e,t,-n/2,a),X(e,t,o,n/2);let s=(t,n)=>e.add(new re(t,t,o-a,54,1,!0,0,Math.PI*1.5).translate(0,(o-a)/2,0).rotateZ(-Math.PI/2).translate(a,0,0),n);s(t,{hull:!0}),s(t-r,{hull:!1});let c=new ue(o-a,r).rotateX(-Math.PI/2).translate((a+o)/2,0,t-r/2),l=new ue(o-a,r).translate((a+o)/2,t-r/2,0);e.add(c,{hull:!1}),e.add(l,{hull:!1});for(let n of[a,o]){let i=new v(t-r,t,12,1,0,Math.PI/2).rotateY(-Math.PI/2).translate(n,0,0);e.add(i,{hull:!1})}let u=t-r+i;e.hatch(a,o,u,t,.06,(e,t)=>U(e,.001,t)),e.hatch(a,o,t-r,u,.022,(e,t)=>U(e,.001,t),-1),e.hatch(a,o,u,t,.06,(e,t)=>U(e,t,.001)),e.hatch(a,o,t-r,u,.022,(e,t)=>U(e,t,.001),-1),e.seg(U(a,.001,u),U(o,.001,u)),e.seg(U(a,u,.001),U(o,u,.001)),Z(e,t,-n/2,-1);let d=t+.16;e.add(K(q(d,.09,!1,64),U(n/2-.09,0,0),U(1,0,0))),e.add(K(q(d,.09,!1,64),U(n/2+.002,0,0),U(1,0,0))),e.add(K(q(t,.08,!0,64),U(n/2+.09,0,0),U(1,0,0))),Z(e,t,n/2+.17,1);for(let r=0;r<20;r++){let i=r/20*W;e.add(K(q(.018,.3,!1,6),U(n/2-.14,Math.cos(i)*(t+.09),Math.sin(i)*(t+.09)),U(1,0,0)),{kind:`dark`,edges:!1,hull:!1})}let f=Y(e,U(-1.2,t,0),H,{r:.1,len:.4,fr:.2});return Y(e,U(1.05,t,0),H,{r:.08,len:.36,fr:.17}),$(e,-1.15,t,1.3,.32),$(e,1.1,t,1.3,.32),e.anchor(`Cladding (process side)`,U(-.2,t-r+i/2,.02)),e.anchor(`Base metal`,U(.25,.02,t-.03)),e.anchor(`Body flange`,U(n/2,t+.12,.25)),e.anchor(`Nozzle`,f),e.anchor(`Saddle`,U(-1.15,-t-.16,.55)),e}function Fe(){let e=new G,t=.55,n=3.2;X(e,t,-n/2,n/2),Q(e,t,0);let r=t+.12;e.add(K(q(r,.08,!1,60),U(-n/2-.08,0,0),U(1,0,0))),e.add(K(q(r,.08,!1,60),U(-n/2-.17,0,0),U(1,0,0))),X(e,t,-n/2-.75,-n/2-.17),Z(e,t,-n/2-.75,-1),Y(e,U(-n/2-.46,t,0),H,{r:.12,len:.34,fr:.22}),Y(e,U(-n/2-.46,-t,0),U(0,-1,0),{r:.12,len:.3,fr:.22});let i=n/2+.02;e.add(K(q(r,.1,!1,64),U(i-.02,0,0),U(1,0,0)));let a=i+.081,o=.064;for(let n=-t+.07;n<=t-.07;n+=o*.866){let r=Math.round((n+t)/(o*.866));for(let i=-t+.07+r%2*(o/2);i<=t-.07;i+=o)n*n+i*i<(t-.08)**2&&e.circle(U(a,n,i),U(1,0,0),.02,10)}let s=Y(e,U(1,t,0),H,{r:.13,len:.32,fr:.23});return Y(e,U(-.9,-t,0),U(0,-1,0),{r:.13,len:.24,fr:.23}),$(e,-.95,t,1.05,.3,.05),$(e,1.15,t,1.05,.3,.05),e.anchor(`Shell`,U(.3,t*.5,t*.866)),e.anchor(`Tube sheet`,U(a,-.2,.25)),e.anchor(`Channel`,U(-n/2-.5,-.2,t*.95)),e.anchor(`Shell nozzle`,s),e.anchor(`Saddle`,U(1.15,-t-.14,.45)),e}function Ie(){let e=new G,i=.5,a=-1.55,o=1.4;e.add(K(q(i+.12,.1,!1,64),U(a-.1,0,0),U(1,0,0)));let c=[];for(let e of[-.3,-.1,.1,.3]){let t=Math.sqrt(i*i-e*e)-.06;for(let i=.08;i<=t;i+=.085){let t=new le;t.add(new s(U(a,i,e),U(o,i,e)));let l=new r(0,0,i,i,Math.PI/2,-Math.PI/2,!0).getPoints(18).map(t=>U(o+t.x,t.y,e));t.add(new fe(l)),t.add(new s(U(o,-i,e),U(a,-i,e))),c.push(new n(t,96,.022,6,!1))}}for(let t of c)e.add(t,{edges:!1,hull:!0});[-.85,-.1,.65].forEach((n,r)=>{let a=new b,o=r%2?Math.PI*.2:Math.PI*1.2;a.absarc(0,0,i+.04,o,o+Math.PI*1.6,!1),a.closePath();let s=new t(a,{depth:.03,bevelEnabled:!1,curveSegments:48});s.rotateZ(Math.PI/2).rotateY(Math.PI/2).translate(n,0,0),e.add(s)});for(let[t,n]of[[.36,.3],[-.36,-.3]])e.add(K(q(.014,o-a-.2,!1,8),U(a,t,n),U(1,0,0)),{edges:!1});for(let t of[-.85,.65])e.add(new _(.1,.3,.9).translate(t,-i-.2,0),{kind:`dark`});return e.anchor(`U-tubes`,U(o+.3,.22,.3)),e.anchor(`Tube sheet`,U(a-.05,i+.06,.2)),e.anchor(`Baffle plate`,U(-.1,-.2,i*.7)),e}function Le(){let e=new G,t=.66,n=-.75,r=.7;e.add(q(t,r-n,!0,72).translate(0,n,0)),e.add(J(t,t/2).translate(0,r,0)),e.add(J(t,t/2).rotateX(Math.PI).translate(0,n,0));let i=t+.07;e.add(q(i,.95,!0,72).translate(0,n-.05,0)),e.add(new v(t,i,72).rotateX(-Math.PI/2).translate(0,n+.9,0),{hull:!1}),e.add(new v(t-.1,i,72).rotateX(Math.PI/2).translate(0,n-.05,0),{hull:!1}),Y(e,U(i-.02,n+.75,0),U(1,0,0),{r:.05,len:.18,fr:.1,bolts:4}),Y(e,U(0,n+.05,i-.02),U(0,0,1),{r:.05,len:.18,fr:.1,bolts:4});let a=Y(e,U(0,r+t/2-.04,0),H,{r:.14,len:.16,fr:.24});e.add(q(.12,.2,!1,32).translate(0,a.y,0)),e.add(new _(.36,.28,.36).translate(0,a.y+.34,0),{kind:`dark`}),e.add(q(.13,.42,!1,40).translate(0,a.y+.48,0),{kind:`dark`});for(let n of[.6,2.2,3.6,5]){let i=Math.cos(n)*.42,a=Math.sin(n)*.42;Y(e,U(i,r+t/2*Math.sqrt(Math.max(0,1-(.42/t)**2))-.03,a),H,{r:n===3.6?.16:.07,len:.22,fr:n===3.6?.26:.13,bolts:8})}Y(e,U(0,n-t/2+.03,0),U(0,-1,0),{r:.08,len:.18,fr:.15});let o=n-t/2-.42;for(let t=0;t<4;t++){let r=t/4*W+Math.PI/4,a=Math.cos(r)*(i+.06),s=Math.sin(r)*(i+.06);e.add(q(.045,n+.2-o,!1,16).translate(a,o,s),{kind:`dark`}),e.add(new _(.2,.025,.2).translate(a,o,s),{kind:`dark`})}return e.anchor(`Drive`,U(.13,a.y+.62,.1)),e.anchor(`Top head`,U(.3,r+.24,.3)),e.anchor(`Jacket`,U(i*.7,n+.3,i*.7)),e.anchor(`Nozzles`,U(Math.cos(3.6)*.42,r+.55,Math.sin(3.6)*.42)),e.anchor(`Support leg`,U(Math.cos(Math.PI/4)*(i+.06),o+.3,Math.sin(Math.PI/4)*(i+.06))),e}function Re(){let e=new G,t=.11,r=new le,i=U(-1.8,-.55,.2),a=U(-.2,-.55,.2),o=U(.3,-.05,.2),c=U(.3,.45,.2),l=U(.8,.95,.2),u=U(1.75,.95,.2);r.add(new s(i,a)),r.add(new me(a,U(.3,-.55,.2),o)),r.add(new s(o,c)),r.add(new me(c,U(.3,.95,.2),l)),r.add(new s(l,u)),e.add(new n(r,160,t,28,!1),{edges:!1});let d=(t,n)=>e.add(K(q(.22,.06,!1,44),t,n));d(i.clone().add(U(-.06,0,0)),U(1,0,0)),d(u.clone().add(U(0,0,0)),U(1,0,0)),d(U(-1,-.55,.2),U(1,0,0)),d(U(-.94,-.55,.2),U(1,0,0));for(let n of[a,o,c,l]){let r=n===a||n===l?U(1,0,0):H;e.circle(n,r,t+.004,32)}let f=Y(e,U(-.55,-.55,.2+t-.02),U(0,0,1),{r:.065,len:.42,fr:.14,bolts:6});return e.add(new _(.08,.5,.36).translate(-1.4,-.92,.2),{kind:`dark`}),e.add(new _(.36,.08,.36).translate(-.06,-1.1,.2),{kind:`dark`}),e.add(q(.04,.4,!1,12).translate(-.06,-1.06,.2),{kind:`dark`}),e.anchor(`Pipe spool`,U(.3+t*.7,.22,.2+t*.7)),e.anchor(`Long-radius bend`,U(.18,-.4,.2+t)),e.anchor(`Branch`,f),e.anchor(`Flanged joint`,U(-.97,-.33,.25)),e}function ze(){let e=new G,t=2.4,n=1.2,r=1.2;e.add(new _(t,n,r));let i=.05;for(let n of[-.22,.28])e.add(new _(t+i*2,.06,i).translate(0,n,r/2+i/2),{kind:`dark`}),e.add(new _(t+i*2,.06,i).translate(0,n,-r/2-i/2),{kind:`dark`}),e.add(new _(i,.06,r).translate(t/2+i/2,n,0),{kind:`dark`}),e.add(new _(i,.06,r).translate(-t/2-i/2,n,0),{kind:`dark`});for(let t of[-.6,0,.6])e.add(new _(.06,n,i).translate(t,0,r/2+i/2),{kind:`dark`}),e.add(new _(.06,n,i).translate(t,0,-r/2-i/2),{kind:`dark`});let a=Y(e,U(-.6,n/2-.02,0),H,{r:.24,len:.12,fr:.32,blind:!0,bolts:12});Y(e,U(.75,n/2-.02,.2),H,{r:.06,len:.2,fr:.12,bolts:6});let o=Y(e,U(t/2-.02,-n/2+.2,0),U(1,0,0),{r:.08,len:.22,fr:.16});for(let r of[-.4,.4])e.add(new _(t+.2,.12,.12).translate(0,-n/2-.06,r),{kind:`dark`});return e.anchor(`Tank shell`,U(-.3,.05,r/2)),e.anchor(`Stiffener`,U(.6,.28,r/2+i)),e.anchor(`Top manhole`,a),e.anchor(`Outlet nozzle`,o),e}var Be={"01":Me,"02":Pe,"03":Fe,"04":Ie,"05":Le,"06":Re,"07":ze};function Ve(e,t){let n=new a,r=new Map;for(let t of e.parts)r.has(t.kind)||r.set(t.kind,[]),r.get(t.kind).push(t.geometry);for(let[e,i]of r){let r=new g(Oe(i),t.fill[e]??t.fill.body);n.add(r)}let i=e.parts.filter(e=>e.hull).map(e=>e.geometry);if(i.length){let e=new g(Oe(i),t.hull);e.renderOrder=1,n.add(e)}if(e.lines.length){let r=De(e.lines,t.pen);r.renderOrder=2,n.add(r)}let o=new y;for(let e of n.children)e.isMesh&&o.expandByObject(e);return{group:n,anchors:e.anchors,box:o}}export{Ce as a,Ee as c,Me as i,De as l,Ne as n,we as o,Be as r,Te as s,Ve as t};