package main

import (
	"database/sql"
	"log"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/template/html/v2"
	_ "modernc.org/sqlite" // SQLite driver
)

// --- Structs ---

type Player struct {
	ID        int       `json:"id"`
	Name      string    `json:"name"`
	CreatedAt time.Time `json:"created_at"`
}

// Global variable for the database connection
var db *sql.DB

func main() {
	// Initialize database connection
	var err error
	db, err = sql.Open("sqlite", "./database.db")
	if err != nil {
		log.Fatalf("Failed to open database: %v", err)
	}
	defer db.Close()

	if err = db.Ping(); err != nil {
		log.Fatalf("Failed to ping database: %v", err)
	}
	log.Println("Database connection successful!")

	// --- Initialize Fiber with template engine ---
	engine := html.New("./views", ".html")
	engine.Reload(true) 
	app := fiber.New(fiber.Config{
		Views: engine,
	})

	// --- Static Files ---
	app.Static("/static", "./static")

	// --- Routes ---
	app.Get("/", func(c *fiber.Ctx) error {
		players, err := getPlayers()
		if err != nil {
			log.Printf("Error getting players: %v", err)
			// Handle error appropriately, maybe render an error page
			return c.Status(fiber.StatusInternalServerError).SendString("Error fetching players")
		}
		return c.Render("index", fiber.Map{
			"Title":   "Player List",
			"Players": players, // Pass players to the template
		})
	})

	// Example HTMX route (can be removed or adapted later)
	app.Get("/load-content", func(c *fiber.Ctx) error {
		time.Sleep(500 * time.Millisecond)
		return c.SendString("<p>Content loaded via HTMX at " + time.Now().Format(time.Kitchen) + "</p>")
	})

	// --- Database Schema Setup (Example) ---
	if err := createTables(); err != nil {
		log.Printf("Warning: Could not create tables (might already exist): %v", err)
	}

	// --- Start Server ---
	log.Println("Starting server on :3000")
	log.Fatal(app.Listen(":3000"))
}

// --- Database Functions ---

func createTables() error {
	query := `
    CREATE TABLE IF NOT EXISTS players (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS matches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        played_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    -- Add other tables (match_players, teams, etc.) based on your needs
    `
	_, err := db.Exec(query)
	return err
}

// getPlayers fetches all players from the database
func getPlayers() ([]Player, error) {
	rows, err := db.Query("SELECT id, name, created_at FROM players ORDER BY name")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	players := []Player{}
	for rows.Next() {
		var p Player
		var createdAtStr string // Read timestamp as string first
		if err := rows.Scan(&p.ID, &p.Name, &createdAtStr); err != nil {
			return nil, err
		}
		// Parse the timestamp string (adjust format if necessary based on SQLite storage)
		p.CreatedAt, err = time.Parse("2006-01-02 15:04:05", createdAtStr)
        if err != nil {
            // Fallback or handle potential parsing errors - Log for now
            log.Printf("Warning: Could not parse timestamp '%s' for player %d: %v", createdAtStr, p.ID, err)
            // Optionally, set a zero time or skip this field
        }
		players = append(players, p)
	}

	if err = rows.Err(); err != nil {
		return nil, err
	}

	return players, nil
}

// Add other database interaction functions here (e.g., addPlayer, getMatches, addMatch)

