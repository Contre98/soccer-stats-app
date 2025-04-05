{pkgs}: {
  channel = "stable-24.05";
  packages = [
    pkgs.nodejs_20
    pkgs.go_1_22  # Added Go 1.22
  ];

  idx.extensions = [

  ];
  idx.previews = {
    previews = {
      web = {
        # Update this command for the Go app later
        command = [
          "go"
          "run"
          "main.go"
          # Consider adding flags for port/host if needed
          # For example: "--port" "$PORT" 
        ];
        manager = "web";
      };
      # Optional: Add a separate preview for tailwind watch
      # tailwind = {
      #   command = ["npm", "run", "tailwind:watch"];
      #   manager = "process";
      # };
    };
  };
}
# asdasddsadas
