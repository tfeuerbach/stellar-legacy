<script lang="ts">
	import { fade } from 'svelte/transition';
</script>

<svelte:head>
	<title>Stellar Legacy / About</title>
	<meta name="description" content="How Stellar Legacy works. Neutron monitors, cosmic ray counts, normalization, and the pipeline that turns real physics data into generative visuals." />
	<link rel="canonical" href="https://stellar-legacy.tfeuerbach.dev/about" />
	<meta property="og:url" content="https://stellar-legacy.tfeuerbach.dev/about" />
	<meta property="og:title" content="Stellar Legacy / About" />
	<meta property="og:description" content="How Stellar Legacy works. Neutron monitors, cosmic ray counts, normalization, and the pipeline that turns real physics data into generative visuals." />
	<meta name="twitter:title" content="Stellar Legacy / About" />
	<meta name="twitter:description" content="How Stellar Legacy works. Neutron monitors, cosmic ray counts, and the pipeline behind the visuals." />
</svelte:head>

<div class="about-page" in:fade={{ duration: 300 }}>
	<article class="content">
		<h1>Stellar Legacy</h1>

		<section class="intro">
			<p>
				There are neutron monitors all over the world that count particles from cosmic rays
				hitting the atmosphere. They report numbers every five minutes. This site takes those
				numbers and uses them to generate visuals.
			</p>
			<p>
				The numbers come from real detectors in real places (Finland, Switzerland, South Pole,
				etc). They're not random, not simulated. The count rate at a given station at a given
				moment becomes a seed value between 0 and 1, and that seed drives everything you see.
			</p>
			<p>
				There's no real practical purpose here. It's just a cool thing that works: ancient
				supernova debris hits a detector, the detector reports a number, and that number
				ends up controlling what your GPU renders.
			</p>
		</section>

		<section>
			<h2>What the stations measure</h2>
			<p>
				Cosmic rays are mostly protons from supernovae and other high energy events outside
				the solar system. When one of them hits the upper atmosphere it triggers a shower of
				secondary particles, including neutrons that make it all the way to ground level.
			</p>
			<p>
				A neutron monitor is a gas-filled tube (boron trifluoride or helium-3) that produces
				an electrical pulse when a neutron passes through it. Count those pulses and you get
				<strong>counts per second</strong>, which is the raw measurement this whole site is
				built on.
			</p>
		</section>

		<section>
			<h2>What the numbers mean</h2>
			<p>
				Different stations see very different count rates depending on altitude and location.
				Oulu in Finland reads about 85 to 110 counts/s. Jungfraujoch in the Swiss Alps (3570m up)
				gets 300 to 380 because there's less atmosphere above it. South Pole is around 240 to 295.
				Mexico City only gets 195 to 245 even at 2274m because Earth's magnetic field is
				stronger near the equator and blocks more of the incoming particles.
			</p>
			<p>
				The GV number next to each station in the selector is the geomagnetic cutoff rigidity,
				basically how much shielding that location has. Low GV (like South Pole at 0.1) means
				almost everything gets through. High GV (Mexico City at 8.28) means only the most
				energetic rays make it.
			</p>
			<p>
				Things that change the count rate:
			</p>
			<ul>
				<li><strong>Solar activity.</strong> When the Sun is more active its magnetic field
					blocks more cosmic rays from reaching us, so counts go down. When it's quieter,
					more get through.</li>
				<li><strong>Forbush decreases.</strong> A coronal mass ejection passes Earth and
					temporarily shields us. Counts drop 5 to 15% in hours, then take days to recover.
					These are the sharp dips in the data.</li>
				<li><strong>Pressure.</strong> More air above the detector absorbs more neutrons.
					Stations correct for this but there's still some noise.</li>
			</ul>
		</section>

		<section>
			<h2>Reading spikes and dips</h2>
			<p>
				Usually the numbers barely change between readings. When they do move significantly,
				here's what's probably going on:
			</p>

			<div class="mode-desc">
				<h3>Sudden dip (5 to 15% drop)</h3>
				<p>
					A coronal mass ejection just passed Earth. Its magnetic field blocks incoming
					cosmic rays for a while. Drops fast, recovers slow (days). If multiple stations
					dip at the same time, that's confirmation. On this site the seed drops toward 0
					and things get quiet.
				</p>
			</div>

			<div class="mode-desc">
				<h3>Sudden spike</h3>
				<p>
					Rare. Usually a Ground Level Enhancement (GLE) where solar particles from a big
					flare are energetic enough to produce extra neutrons on their own. If polar stations
					spike first and equatorial ones don't react much, it's solar particles following
					field lines to the poles.
				</p>
			</div>

			<div class="mode-desc">
				<h3>Slow rise over months</h3>
				<p>
					The Sun getting quieter (moving toward solar minimum). Its weaker field lets more
					cosmic rays through. The historical range expands over time to account for this.
				</p>
			</div>

			<div class="mode-desc">
				<h3>One station acting weird</h3>
				<p>
					Probably hardware. If every other station is flat and one spikes, it's flagged as
					anomalous (more than 3 sigma from the poll mean). Still stored, just marked.
				</p>
			</div>
		</section>

		<section>
			<h2>From counts to seed</h2>
			<p>
				We normalize each station's count rate against its own historical min and max:
			</p>
			<pre class="formula">seed = (counts - min) / (max - min)</pre>
			<p>
				So 0 means the station is at its lowest ever, 1 means its highest ever. The range
				grows automatically when new extremes show up.
			</p>
			<p>Example with Oulu reading 92.06 counts/s (historical range 85 to 104):</p>
			<pre class="formula">(92.06 - 85.00) / (103.89 - 85.00) = 7.06 / 18.89 ≈ 0.374</pre>
			<p>
				There's also a <strong>delta</strong> value which is just current seed minus previous
				seed. Bigger delta means something changed fast, so the visuals react with more
				movement.
			</p>
		</section>

		<section>
			<h2>Modes</h2>

			<div class="mode-desc">
				<h3>Noise</h3>
				<p>
					GLSL shader that mixes static grain and smooth curl noise based on the seed.
					Low seed = grainy and cold, high seed = warm and flowing. Each station has its
					own color palette so they look distinct even at similar values.
				</p>
			</div>

			<div class="mode-desc">
				<h3>Pipes</h3>
				<p>
					3D pipes growing through space, like the old Windows screensaver. Colors come from
					hashing the station code into a palette scheme. More flux = more pipes, faster.
					Clears itself every 60 seconds.
				</p>
			</div>

			<div class="mode-desc">
				<h3>Crossing</h3>
				<p>
					Top-down pedestrian intersection. Number of people on screen matches the raw count
					rate. Higher counts = busier streets. Delta makes the crowd move more erratically.
				</p>
			</div>

			<div class="mode-desc">
				<h3>Runner</h3>
				<p>
					Playable. Neutron particles fly at you and you dodge with A/D and SPACE. Count rate
					sets spawn rate and speed. High-flux stations are harder. Score is survival time.
				</p>
			</div>

			<div class="mode-desc">
				<h3>Voxel</h3>
				<p>
					Minecraft-style world where the station code scrambles the terrain noise. Each station
					produces a different landscape. You can walk around, break and place blocks. Built on
					<a href="https://github.com/vyse12138/minecraft-threejs" target="_blank" rel="noopener">minecraft-threejs</a>.
				</p>
			</div>
		</section>

		<section>
			<h2>Pipeline</h2>
			<p>
				Python poller hits <code>nmdb.eu/rt/realtime.txt</code> every 5 minutes, normalizes
				the counts, writes to Postgres. Postgres notifies the NestJS backend over a trigger,
				backend pushes to connected browsers via WebSocket. Frontend interpolates toward the
				new values so transitions are smooth, and captures a noise-mode screenshot for each
				station into a rolling 24-hour archive.
			</p>
		</section>

		<section>
			<h2>Credits</h2>
			<p>
				Data from <a href="https://www.nmdb.eu" target="_blank" rel="noopener">NMDB</a>
				(EU FP7, contract 213007). Station credits are shown on each visualization.
			</p>
		</section>
	</article>
</div>

<style>
	.about-page {
		min-height: 100vh;
		background: var(--color-bg);
		padding: 80px 24px 160px;
		overflow-y: auto;
	}

	.content {
		max-width: 680px;
		margin: 0 auto;
	}

	h1 {
		font-family: var(--font-display);
		font-size: 2.4rem;
		font-weight: 400;
		color: var(--color-text);
		letter-spacing: -0.03em;
		margin-bottom: 32px;
	}

	.intro {
		margin-bottom: 64px;
		padding-bottom: 48px;
		border-bottom: 1px solid rgba(232, 230, 225, 0.06);
	}

	.epigraph {
		font-family: var(--font-display);
		font-size: 1.15rem;
		line-height: 1.65;
		color: rgba(232, 230, 225, 0.65);
		font-style: italic;
		margin-bottom: 24px;
		padding-left: 20px;
		border-left: 2px solid rgba(123, 140, 222, 0.25);
	}

	.epigraph cite {
		display: block;
		margin-top: 10px;
		font-size: 0.72rem;
		font-style: normal;
		font-family: var(--font-mono);
		color: rgba(232, 230, 225, 0.3);
		letter-spacing: 0.03em;
	}

	.intro p {
		font-size: 0.78rem;
		line-height: 1.9;
		color: rgba(232, 230, 225, 0.5);
	}

	h2 {
		font-family: var(--font-display);
		font-size: 1.2rem;
		font-weight: 400;
		color: var(--color-text);
		margin-bottom: 14px;
		letter-spacing: -0.01em;
	}

	h3 {
		font-family: var(--font-mono);
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--color-accent);
		letter-spacing: 0.04em;
		margin-bottom: 6px;
	}

	section {
		margin-bottom: 48px;
	}

	p {
		font-family: var(--font-mono);
		font-size: 0.76rem;
		line-height: 1.85;
		color: rgba(232, 230, 225, 0.55);
		margin-bottom: 14px;
	}

	strong {
		color: rgba(232, 230, 225, 0.8);
		font-weight: 600;
	}

	em {
		color: rgba(232, 230, 225, 0.65);
	}

	a {
		color: var(--color-accent);
		text-decoration: none;
		border-bottom: 1px solid rgba(123, 140, 222, 0.3);
		transition: border-color 0.2s ease;
	}

	a:hover {
		border-color: var(--color-accent);
		text-decoration: none;
	}

	ul, ol {
		padding-left: 20px;
		margin-bottom: 14px;
	}

	li {
		font-family: var(--font-mono);
		font-size: 0.76rem;
		line-height: 1.85;
		color: rgba(232, 230, 225, 0.55);
		margin-bottom: 10px;
	}

	code {
		font-family: var(--font-mono);
		font-size: 0.68rem;
		background: rgba(232, 230, 225, 0.06);
		padding: 2px 5px;
		border-radius: 3px;
		color: rgba(232, 230, 225, 0.65);
	}

	.formula {
		font-family: var(--font-mono);
		font-size: 0.65rem;
		line-height: 1.7;
		color: rgba(232, 230, 225, 0.4);
		background: rgba(0, 0, 0, 0.3);
		border: 1px solid rgba(232, 230, 225, 0.05);
		border-radius: 8px;
		padding: 14px 18px;
		margin: 12px 0 16px;
		overflow-x: auto;
		white-space: pre;
	}

	.mode-desc {
		margin-bottom: 18px;
		padding: 14px 18px;
		background: rgba(232, 230, 225, 0.02);
		border-radius: 8px;
		border: 1px solid rgba(232, 230, 225, 0.04);
	}

	.mode-desc p {
		margin-bottom: 0;
	}

	@media (max-width: 640px) {
		.about-page {
			padding: 60px 16px 80px;
		}

		h1 {
			font-size: 1.8rem;
			margin-bottom: 24px;
		}

		h2 {
			font-size: 1.05rem;
		}

		.intro {
			margin-bottom: 40px;
			padding-bottom: 32px;
		}

		.epigraph {
			font-size: 1rem;
			padding-left: 14px;
		}

		section {
			margin-bottom: 36px;
		}

		.formula {
			font-size: 0.58rem;
			padding: 10px 12px;
		}

		.mode-desc {
			padding: 10px 12px;
		}
	}
</style>
