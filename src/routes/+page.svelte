


<svelte:head>
	<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined" />
</svelte:head>

<script lang="ts">
	let wheel: HTMLDivElement;

	function spinWheel() {
		const value = Math.ceil(Math.random() * 3600);
		wheel.style.transform = `rotate(${value}deg)`;
	}

	function getColor(i: number): string {
		const colors = [
			"#db7093", "#20b2aa", "#d63e92", "#daa520",
			"#ff340f", "#ff7f50", "#3cb371", "#4169e1"
		];
		return colors[i % colors.length];
	}
	let m;
	let i =0;
	let tasks=[];
	let task;
	function AddTask(){
		tasks[i] = task;
		i++;
	}
</script>

<main>
	<div class="pack">
		<div class="header">
			<div class="heading">Lucky Chant</div>
			<div class="icons">
				<a href="https://google.com" class="home">
					<span class="material-symbols-outlined" id="home">home</span> Home
				</a>
				<a href="https://google.com" class="contact">
					<span class="material-symbols-outlined" id="contact">contact_page</span> Contact Me
				</a>
			</div>
			<div class="search">
				<input type="text" placeholder="Search.." id="search" >
				<button class="search_button">
					<span class="material-symbols-outlined" id="srch">search</span>
				</button>
			</div>
		</div>
	</div>

	<div class="content">
		<div class="list">
			<div class="task">
				<input type="text" placeholder="Your Tasks.." id="task" bind:value={task}>
				<button class="add_tasks" on:click={AddTask}><span id="add">+</span></button>
			</div>
			<div class="task_list"><ul>
				{#each tasks as t}
				<li>{t}</li>
				{/each}
			</ul></div>
		</div>

		<div class="silhouette">
			<div class="circle">
				<button class="spinBtn" on:click={spinWheel}>spin</button>
				<div class="wheel" bind:this={wheel}>
					{#each Array(8) as _, i}
						<div class="number" style="--i:{i + 1};--clr:{getColor(i)}">
							<span>--</span>
						</div>
					{/each}
				</div>
			</div>
		</div>
	</div>
</main>



<style>
	
</style>
