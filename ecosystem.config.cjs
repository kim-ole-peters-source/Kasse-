module.exports = {
  apps: [
    {
      name: "peters-kasse",
      script: "npm",
      args: "run start",
      env: {
        NODE_ENV: "production",
        PORT: "3000",
      },
    },
  ],
};
