module.exports = {
  apps : [{
    name        : "zp",
    script      : "./cluster.js",
    watch       : true,
    env: {
      "NODE_ENV": "dev",
    },
    // max_restarts : 1,
    env_production : {
       "NODE_ENV": "production"
    }
  }]
}
