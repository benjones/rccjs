<script lang="ts">
	import '../app.css';

	let { children } = $props();
</script>

<div class="h-[95vh] min-h-[95vh]">
	{@render children()}
</div>
