if (!window.__GBH_THREE_RUNTIME_READY__ || !window.THREE) {
  throw new Error('The shared Three.js runtime must be installed before classic engine scripts load.');
}var Z = { EMPTY: 0, WALL: 1, BUSH: 2, WATER: 3 },
  Fc = { STONE: 0, CRATE: 1, BARREL: 2, CACTUS: 3, ROCK: 4, LAMP: 5 },
  Ic = 0.4,
  Lc = {
    bots: 7,
    gasDelay: 26,
    gasDuration: 140,
    gasStartHalf: 25,
    gasEndHalf: 4,
    startHour: 15.4,
    endHour: 21.2,
    dayLength: 205,
    boxHp: 4200,
    cubeHp: 400,
    cubeDamage: 0.1,
  },
  Rc = { height: 3.05, arm: 0.62, near: 0.4, far: 10.5, angle: 1, size: 0.55, nearClamp: 2.3 },
  zc = (e) => e,
  Bc = {
    dusty: {
      id: `dusty`,
      name: `Athallah`,
      role: `Shotgunner`,
      blurb: `Wide buckshot cone. Deadly up close.`,
      hp: 3900,
      speed: 3.15,
      reload: 1.35,
      preferred: 3.6,
      palette: { body: zc(15906354), accent: zc(9064408), skin: zc(15844506), dark: zc(3811914) },
      superCharge: 3e3,
      attack: {
        kind: `spread`,
        pellets: 5,
        spread: 0.5,
        range: 7,
        speed: 15,
        damage: 330,
        radius: 0.15,
        color: zc(16753978),
      },
      super: {
        kind: `spread`,
        pellets: 9,
        spread: 0.85,
        range: 8,
        speed: 16,
        damage: 340,
        radius: 0.2,
        color: zc(16769354),
        knockback: 9,
        breaksWalls: !0,
      },
    },
    ace: {
      id: `ace`,
      name: `Zeyd`,
      role: `Sharpshooter`,
      blurb: `Long range six-shot burst.`,
      hp: 3e3,
      speed: 3.25,
      reload: 1.5,
      preferred: 6.8,
      palette: { body: zc(3108822), accent: zc(12728874), skin: zc(15250570), dark: zc(2042436) },
      superCharge: 3600,
      attack: {
        kind: `burst`,
        count: 6,
        interval: 0.08,
        range: 9.5,
        speed: 19,
        damage: 200,
        radius: 0.13,
        color: zc(7328511),
        jitter: 0.035,
      },
      super: {
        kind: `burst`,
        count: 12,
        interval: 0.06,
        range: 11.5,
        speed: 21,
        damage: 340,
        radius: 0.2,
        color: zc(16773242),
        jitter: 0.05,
        pierce: !0,
        breaksWalls: !0,
      },
    },
    fuse: {
      id: `fuse`,
      name: `Azka`,
      role: `Thrower`,
      blurb: `Lobs bombs over walls.`,
      hp: 2900,
      speed: 3,
      reload: 1.55,
      preferred: 5.8,
      palette: { body: zc(14836266), accent: zc(16175674), skin: zc(15318422), dark: zc(3878953) },
      superCharge: 3e3,
      maxAmmo: 5,
      attack: { kind: `lob`, range: 7.5, flight: 0.72, fuse: 0.38, blast: 1.55, damage: 920, color: zc(16742954) },
      super: {
        kind: `lob`,
        range: 8.5,
        flight: 0.95,
        fuse: 0.7,
        blast: 2.8,
        damage: 2400,
        color: zc(16765498),
        knockback: 10,
        breaksWalls: !0,
        big: !0,
      },
    },
    titan: {
      id: `titan`,
      name: `Einar`,
      role: `Heavyweight`,
      blurb: `Huge health. Punches and leaps.`,
      hp: 6200,
      speed: 3.45,
      reload: 0.85,
      preferred: 1.6,
      palette: { body: zc(2772920), accent: zc(14826042), skin: zc(14262906), dark: zc(1712184) },
      superCharge: 3200,
      attack: {
        kind: `melee`,
        count: 4,
        interval: 0.09,
        range: 2.7,
        speed: 13,
        damage: 390,
        radius: 0.48,
        color: zc(16734794),
        jitter: 0.12,
      },
      super: {
        kind: `leap`,
        range: 8,
        flight: 0.75,
        blast: 2.3,
        damage: 1e3,
        color: zc(16765498),
        knockback: 11,
        breaksWalls: !0,
      },
    },
    volt: {
      id: `volt`,
      name: `Nopal`,
      role: `Skirmisher`,
      blurb: `Fast pulse bursts. Piercing overload super.`,
      hp: 3400,
      speed: 3.55,
      reload: 1.25,
      preferred: 5.4,
      palette: { body: zc(3213010), accent: zc(65495), skin: zc(15183569), dark: zc(1186350) },
      superCharge: 3200,
      attack: {
        kind: `burst`,
        electric: !0,
        count: 3,
        interval: 0.075,
        range: 8.4,
        speed: 20,
        damage: 380,
        radius: 0.15,
        color: zc(4259839),
        jitter: 0.025,
      },
      super: {
        kind: `burst`,
        electric: !0,
        count: 8,
        interval: 0.055,
        range: 10.2,
        speed: 23,
        damage: 310,
        radius: 0.19,
        color: zc(65535),
        jitter: 0.035,
        pierce: !0,
        breaksWalls: !0,
      },
    },
  },
  Vc = [
    `Rusty`,
    `Nova`,
    `Pixel`,
    `Bolt`,
    `Maple`,
    `Onyx`,
    `Ziggy`,
    `Comet`,
    `Pepper`,
    `Havoc`,
    `Mango`,
    `Sprocket`,
    `Biscuit`,
    `Turbo`,
  ],
  Hc = {
    auto: { label: `Auto`, damage: 0.68, skill: [0.45, 0.78], react: 1.4, cadence: 1.3, hunters: 2, engage: 6.5, dodge: 0.55, adaptive: !0 },
    easy: { label: `Easy`, damage: 0.5, skill: [0.3, 0.6], react: 1.9, cadence: 1.6, hunters: 1, engage: 5.5, dodge: 0.18 },
    normal: { label: `Normal`, damage: 0.68, skill: [0.45, 0.78], react: 1.4, cadence: 1.3, hunters: 2, engage: 6.5, dodge: 0.48 },
    hard: { label: `Hard`, damage: 0.85, skill: [0.62, 0.95], react: 1, cadence: 1, hunters: 3, engage: 9, dodge: 0.78 },
    brutal: { label: `Brutal`, damage: 1, skill: [0.82, 1], react: 0.72, cadence: 0.82, hunters: 4, engage: 11, dodge: 0.96 },
  },
  MATCH_MODES = {
    classic: { label: `Classic`, bots: 7, gasDelay: 26, gasDuration: 140, gasEndHalf: 4, boxHp: 4200, cubeDamage: 0.1, dayLength: 205 },
    blitz: { label: `Blitz`, bots: 5, gasDelay: 10, gasDuration: 78, gasEndHalf: 3.5, boxHp: 3500, cubeDamage: 0.13, dayLength: 112 },
  },
  Uc = {
    low: {
      label: `Low`,
      renderScale: 0.9,
      msaa: 0,
      shadowMap: 1024,
      pcss: !1,
      tier: 0,
      ao: !1,
      bloom: !1,
      lampShadows: !1,
      lampMap: 512,
      poolLights: 4,
    },
    medium: {
      label: `Medium`,
      renderScale: 1,
      msaa: 2,
      shadowMap: 2048,
      pcss: !0,
      tier: 1,
      ao: !1,
      bloom: !0,
      lampShadows: !0,
      lampMap: 512,
      poolLights: 6,
    },
    high: {
      label: `High`,
      renderScale: 1.25,
      msaa: 4,
      shadowMap: 2048,
      pcss: !0,
      tier: 2,
      ao: !0,
      bloom: !0,
      lampShadows: !0,
      lampMap: 1024,
      poolLights: 10,
    },
    ultra: {
      label: `Ultra`,
      renderScale: 2,
      msaa: 4,
      shadowMap: 3072,
      pcss: !0,
      tier: 3,
      ao: !0,
      bloom: !0,
      lampShadows: !0,
      lampMap: 1024,
      poolLights: 12,
    },
  },
  Wc = `

		#define PCSS_SUN_DEPTH_SOFTNESS ${(120 * 0.085 * 0.5).toFixed(4)}
		#define PCSS_SUN_MAX_WORLD ${(0.2).toFixed(4)}
		#define PCSS_LAMP_NEAR ${Rc.near.toFixed(4)}
		#define PCSS_LAMP_FAR ${Rc.far.toFixed(4)}
		#define PCSS_LAMP_MAX_UV ${(0.022).toFixed(4)}
		#define PCSS_NOISE_PERIOD ${(64).toFixed(1)}

		float pcssNoise( vec2 p ) {

			return fract( 52.9829189 * fract( dot( p, vec2( 0.06711056, 0.00583715 ) ) ) );

		}

		vec2 pcssDisk( int i, float n, float phi ) {

			float r = sqrt( ( float( i ) + 0.5 ) / n );
			float theta = float( i ) * 2.399963229728653 + phi;
			return vec2( cos( theta ), sin( theta ) ) * r;

		}

		float pcssLinearDepth( float z ) {

			return PCSS_LAMP_NEAR * PCSS_LAMP_FAR / ( PCSS_LAMP_FAR - z * ( PCSS_LAMP_FAR - PCSS_LAMP_NEAR ) );

		}

		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {

			float shadow = 1.0;

			shadowCoord.xyz /= shadowCoord.w;
			shadowCoord.z += shadowBias;

			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;

			if ( frustumTest ) {

				float packed = abs( shadowRadius );
				float tier = floor( packed );
				float param = packed - tier;
				bool persp = shadowRadius < 0.0;

				int nSearch = 8 + int( tier ) * 4;
				int nFilter = 10 + int( tier ) * 8;
				float fSearch = float( nSearch );
				float fFilter = float( nFilter );

				float zR = shadowCoord.z;
				float texel = 1.0 / shadowMapSize.x;
				float maxRadius = persp ? PCSS_LAMP_MAX_UV : PCSS_SUN_MAX_WORLD * param * 0.1;
				// Rotate the sample disk per shadow-map texel, not per screen pixel. A
				// screen-space pattern slides over the world whenever the camera pans, and
				// every penumbra shimmers. The pattern repeats every PCSS_NOISE_PERIOD
				// texels and the shadow frustum only ever moves in whole periods (see
				// Lighting.fitShadow), so the grain stays glued to the ground.
				vec2 grainCell = mod( floor( shadowCoord.xy * shadowMapSize ), PCSS_NOISE_PERIOD );
				float phi = pcssNoise( grainCell ) * 6.28318530718;

				// 1. blocker search: average depth of whatever sits between us and the light

				float blockerSum = 0.0;
				float blockers = 0.0;

				for ( int i = 0; i < 20; i ++ ) {

					if ( i >= nSearch ) break;
					float d = textureLod( shadowMap, shadowCoord.xy + pcssDisk( i, fSearch, phi ) * maxRadius, 0.0 ).r;
					if ( d < zR ) { blockerSum += d; blockers += 1.0; }

				}

				if ( blockers >= fSearch ) {

					shadow = 0.0; // deep umbra, skip the filter

				} else if ( blockers > 0.5 ) {

					// 2. penumbra width grows with the blocker -> receiver distance

					float zB = blockerSum / blockers;
					float radius;

					if ( persp ) {

						float lR = pcssLinearDepth( zR );
						float lB = pcssLinearDepth( zB );
						radius = ( lR - lB ) / ( lB * lR ) * param;

					} else {

						radius = ( zR - zB ) * PCSS_SUN_DEPTH_SOFTNESS * param * 0.1;

					}

					radius = clamp( radius, texel * 1.25, maxRadius );

					// 3. variable-width percentage-closer filter

					float lit = 0.0;

					for ( int i = 0; i < 34; i ++ ) {

						if ( i >= nFilter ) break;
						lit += step( zR, textureLod( shadowMap, shadowCoord.xy + pcssDisk( i, fFilter, phi + 1.7 ) * radius, 0.0 ).r );

					}

					shadow = lit / fFilter;

				}

			}

			return mix( 1.0, shadow, shadowIntensity );

		}

`,
  Gc = null;
function Kc(e) {
  let t = e.indexOf(`#elif defined( SHADOWMAP_TYPE_VSM )`);
  if (t < 0) return null;
  let n = /#[ \t]*(ifdef|ifndef|if|elif|else|endif)\b/g;
  n.lastIndex = t + 5;
  let r = 0,
    i = -1,
    a;
  for (; (a = n.exec(e));) {
    let t = a[1];
    if (t === `if` || t === `ifdef` || t === `ifndef`) r++;
    else if (t === `endif`) {
      if (r === 0)
        return i < 0
          ? null
          : e.slice(i, a.index).includes(`float getShadow( sampler2D shadowMap`)
            ? { start: i, end: a.index }
            : null;
      r--;
    } else if (t === `else` && r === 0 && i < 0) {
      let t = e.indexOf(
        `
`,
        a.index,
      );
      i = t < 0 ? a.index + a[0].length : t;
    }
  }
  return null;
}
function qc() {
  let e = `getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay )`,
    t = `getDistanceAttenuation( max( lightDistance, ${Rc.nearClamp.toFixed(2)} ), spotLight.distance, spotLight.decay )`,
    n = Y.lights_pars_begin;
  n.includes(e)
    ? (Y.lights_pars_begin = n.replace(e, t))
    : console.warn(`[pipeline] spot light chunk changed - lamps keep plain inverse-square falloff`);
}
function Jc() {
  if (Gc !== null) return Gc;
  qc();
  let e = Y.shadowmap_pars_fragment,
    t = Kc(e);
  return t
    ? ((Y.shadowmap_pars_fragment =
        e.slice(0, t.start) +
        `
` +
        Wc +
        `
	` +
        e.slice(t.end)),
      (Gc = !0),
      !0)
    : (console.warn(`[pipeline] shadow chunk layout changed - falling back to hardware PCF shadows`), (Gc = !1), !1);
}
