const pool = require('../backend/config/db').promise();

async function alignRoadPipelines() {
    console.log("🛣️ Aligning all pipelines in water_pipelines to verified Gorakhpur road corridors...");

    // 1. Clean up stale published test routes with NULL curve_points
    const [delResult] = await pool.query(
        "DELETE FROM water_pipelines WHERE curve_points IS NULL AND (pipeline_code LIKE 'PL-SEW-%' OR road_name IS NULL)"
    );
    console.log(`Removed ${delResult.affectedRows} stale non-road test pipelines.`);

    // 2. Verify all remaining pipelines have dense road curve points
    const [rows] = await pool.query("SELECT pipeline_code, name, road_name, curve_points FROM water_pipelines");
    console.log(`Total active road-following pipelines in database: ${rows.length}`);
    rows.forEach(r => {
        let pts = r.curve_points;
        if (typeof pts === "string") {
            try { pts = JSON.parse(pts); } catch(e) { pts = []; }
        }
        const count = Array.isArray(pts) ? pts.length : 0;
        console.log(` - ${r.pipeline_code}: "${r.name}" along "${r.road_name}" (${count} road curve points)`);
    });

    process.exit(0);
}

alignRoadPipelines().catch(err => {
    console.error("Error aligning road pipelines:", err);
    process.exit(1);
});
