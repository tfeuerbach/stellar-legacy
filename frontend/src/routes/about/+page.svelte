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
			<blockquote class="epigraph">
				"We are the cosmos made conscious and life is the means by which the universe understands itself."
				<cite>Brian Cox</cite>
			</blockquote>
			<p>
				Neutron monitors around the world count the particles that cosmic rays leave behind
				when they slam into our atmosphere. Every five minutes, stations in Finland, Switzerland,
				the South Pole and elsewhere report how many they counted. Stellar Legacy takes those
				raw numbers and turns them into visuals. A star exploded millions of years ago, the
				debris eventually reached Earth, a detector counted it, and now that count is driving
				a shader on your screen.
			</p>
			<p>
				There's no practical reason for any of this. It just turns out you can take the literal
				aftermath of a supernova and compress it into a single floating point number between 0
				and 1. That number seeds everything you see here. Every frame is shaped by particles
				older than the Earth.
			</p>
			<p>
				Nothing here is random or simulated. It's a deterministic reflection of what's actually
				happening right now, measured by real instruments, run through some math, and put on
				your screen.
			</p>
		</section>

		<section>
			<h2>What the stations measure</h2>
			<p>
				Cosmic rays are high energy particles (mostly protons) that come from supernova remnants,
				active galactic nuclei, and other violent stuff far outside the solar system. They travel
				at close to the speed of light for millions of years before they get here.
			</p>
			<p>
				When one hits the upper atmosphere (about 15 km up), it collides with nitrogen and oxygen
				and kicks off a cascade of secondary particles: pions, muons, and neutrons. Those
				neutrons make it down to ground level, and that's what the stations count.
			</p>
			<p>
				A <strong>neutron monitor</strong> is basically a set of proportional counters filled
				with boron trifluoride or helium-3 gas, wrapped in polyethylene. A neutron enters the
				tube, reacts with the gas, produces an electrical pulse. The station tallies those
				pulses. That's the raw number: <strong>counts per second</strong>.
			</p>
		</section>

		<section>
			<h2>What the numbers mean</h2>
			<p>
				Oulu (Finland) typically reads around <strong>85 to 110 counts/s</strong>.
				Jungfraujoch (Swiss Alps, 3570m) sees <strong>300 to 380 counts/s</strong> because
				it's higher up with less atmosphere absorbing the cascade. South Pole sits around
				<strong>240 to 295 counts/s</strong>. Mexico City only sees <strong>195 to 245 counts/s</strong>
				despite being at 2274m because it has a strong geomagnetic shield (8.28 GV).
			</p>
			<p>
				The count rate moves around for a few reasons:
			</p>
			<ul>
				<li><strong>Solar activity.</strong> The Sun's magnetic field controls how many cosmic rays
					reach Earth. During solar maximum the heliosphere puffs up and blocks more incoming
					particles, so counts <em>drop</em>. During solar minimum, more get through.
				</li>
				<li><strong>Forbush decreases.</strong> When a coronal mass ejection (CME) sweeps past Earth,
					its shock front temporarily shields us. Counts can drop 5 to 15% in hours, then slowly
					recover over days. These are the sharp dips you see in the data.
				</li>
				<li><strong>Geomagnetic cutoff rigidity.</strong> Measured in gigavolts (GV), this is
					basically the minimum energy a cosmic ray needs to punch through Earth's magnetic field
					at a given location. The field is strongest near the equator, so stations there have
					high rigidity values. Mexico City at 8.28 GV blocks most low energy cosmic rays. Polar
					stations like South Pole (0.1 GV) have almost no magnetic shielding and see nearly
					everything. That's why different stations have wildly different baselines, and why
					the GV value is shown next to each station in the selector. It tells you how exposed
					that detector is.
				</li>
				<li><strong>Atmospheric pressure.</strong> More air above the detector means more neutrons
					get absorbed on the way down. Stations correct for this but small fluctuations remain.
				</li>
			</ul>
		</section>

		<section>
			<h2>Reading spikes and dips</h2>
			<p>
				Most of the time a station's count rate barely moves. A fraction of a percent between
				readings. When something bigger happens, there's usually a real physical reason.
			</p>

			<div class="mode-desc">
				<h3>Sudden dip (counts drop 5 to 15%)</h3>
				<p>
					Almost always a <strong>Forbush decrease</strong>. A coronal mass ejection (basically a
					billion ton cloud of magnetized solar plasma) just swept past Earth. Its magnetic field
					deflects incoming cosmic rays so fewer reach the atmosphere and the neutron count drops.
					It happens fast (hours) but recovery is slow (days to a week). Visually the seed drops
					toward 0 and the render goes quiet. If you see the delta go negative across multiple
					stations at once, a solar storm just hit.
				</p>
			</div>

			<div class="mode-desc">
				<h3>Sudden spike (counts jump sharply)</h3>
				<p>
					Rare. This can mean a <strong>Ground Level Enhancement (GLE)</strong> where solar
					energetic particles from a major flare are intense enough to produce their own neutrons
					in the atmosphere on top of the normal cosmic ray background. GLEs happen maybe a dozen
					times per solar cycle. If the spike shows up at polar stations first and barely registers
					at equatorial ones, it's almost certainly solar particles riding the magnetic field lines
					to the poles. The seed jumps toward 1 and the render lights up.
				</p>
			</div>

			<div class="mode-desc">
				<h3>Gradual rise over months</h3>
				<p>
					That's the solar cycle. As the Sun moves from maximum toward minimum activity, its
					magnetic field weakens and more galactic cosmic rays get through. Count rates climb
					slowly over years. The historical min/max range expands to keep up so the seed stays
					centered instead of getting stuck at 1.
				</p>
			</div>

			<div class="mode-desc">
				<h3>Single station glitch</h3>
				<p>
					If one station spikes while everything else is flat, it's probably a detector issue.
					Power glitch, malfunction, local interference. The poller flags anything more than 3
					standard deviations off the poll's mean as anomalous. They still get stored but are
					marked so they can be filtered out.
				</p>
			</div>
		</section>

		<section>
			<h2>From counts to seed</h2>
			<p>
				Each station's count rate gets normalized against its own historical range. Simple
				min-max normalization:
			</p>
			<pre class="formula">seed = (counts - station_min) / (station_max - station_min)</pre>
			<p>
				The result gets clamped to [0, 1]. A reading at the station's all time low gives you
				<code>seed = 0.0</code>. At its all time high, <code>seed = 1.0</code>. The range
				expands automatically whenever a new extreme is observed.
			</p>
			<p>Say Oulu is reading 92.06 counts/s with a historical range of 85 to 104:</p>
			<pre class="formula">raw = 92.06 counts/s
min = 85.00, max = 103.89

seed = (92.06 - 85.00) / (103.89 - 85.00)
     = 7.06 / 18.89
     ≈ 0.374</pre>
			<p>
				The actual seed for each station updates live every five minutes. You can see the
				current value in the data overlay on the home page.
			</p>
			<p>
				We also track <strong>flux delta</strong>, which is just the difference between the
				current seed and the previous one. This drives animation speed and turbulence. A big
				jump means something changed fast (maybe a Forbush decrease, maybe a data glitch) so
				the visualization reacts with more motion.
			</p>
			<pre class="formula">delta = current_seed - previous_seed</pre>
		</section>

		<section>
			<h2>The five modes</h2>
			<p>
				The seed, delta, and station identity all feed into five visualization modes running
				on your GPU:
			</p>

			<div class="mode-desc">
				<h3>Noise</h3>
				<p>
					Blends white noise (static grain) with curl noise (smooth fluid motion). The seed
					controls the mix. Low seed gives you cold, grainy static. High seed pushes toward warm,
					organic flow. Each station gets a unique hue rotation based on its code, so Oulu looks
					completely different from Jungfraujoch even at the same seed value. Switching stations
					pans smoothly through the noise field and transitions the color palette.
				</p>
			</div>

			<div class="mode-desc">
				<h3>Pipes</h3>
				<p>
					The classic Windows 3D Pipes screensaver but driven by cosmic data. Metallic pipes grow
					through space making 90 degree turns. Each station gets its own color palette (complementary,
					triadic, analogous, or wide spectrum) picked by hashing the station code. Higher flux means
					more pipes moving faster. Lower flux means fewer, slower pipes. The whole scene clears and
					regrows every 60 seconds. Switching stations resets everything with new colors.
				</p>
			</div>

			<div class="mode-desc">
				<h3>Crossing</h3>
				<p>
					A top down pedestrian intersection. Each figure represents a detected neutron. The raw
					count rate sets the crowd size, so a Forbush decrease clears the streets and a GLE floods
					them. Seed controls walk speed and outfit colors. Delta makes people drift around more
					erratically.
				</p>
			</div>

			<div class="mode-desc">
				<h3>Runner</h3>
				<p>
					A playable dodge game. Glowing neutron particles fly at you down a corridor and you
					use A/D to switch lanes and SPACE to dash. The count rate controls how many particles
					spawn and how fast they move. Jungfraujoch is way harder to survive than a quiet
					equatorial station. Your survival time is your score.
				</p>
			</div>

			<div class="mode-desc">
				<h3>Voxel</h3>
				<p>
					A Minecraft style world generated entirely from cosmic data. The station code scrambles
					the Perlin noise permutation table so APTY produces a completely different landscape
					than OULU. Height, tree density, stone prevalence, and sea level all vary per station.
					You can walk around, place and break blocks, and explore a world that only exists
					because of the cosmic rays hitting that specific detector.
				</p>
			</div>
		</section>

		<section>
			<h2>How it works</h2>
			<ol>
				<li>Every 5 minutes the poller grabs <code>www.nmdb.eu/rt/realtime.txt</code>, a plaintext
					feed of every active neutron monitor.</li>
				<li>For each station we track, it takes the latest count rate, checks for outliers (3 sigma
					from the poll mean), normalizes it, computes delta, and writes everything to Postgres.</li>
				<li>Postgres fires a <code>NOTIFY</code>. The backend picks it up and pushes the new reading
					over WebSocket to anyone watching.</li>
				<li>The frontend smoothly interpolates toward the new values (2% per frame for flux, 6% per
					frame for station panning and color) so everything drifts instead of snapping.</li>
				<li>When new data comes in, the frontend renders the noise visualization for every station
					and saves a screenshot. These build up a rolling 24 hour visual record.</li>
			</ol>
		</section>

		<section>
			<h2>Credits</h2>
			<p>
				Data from the <a href="https://www.nmdb.eu" target="_blank" rel="noopener">Neutron Monitor Database (NMDB)</a>,
				funded under the EU FP7 programme (contract no. 213007). Individual stations are credited
				to the institutions that run them. You can see the credit watermark on each visualization.
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
</style>
