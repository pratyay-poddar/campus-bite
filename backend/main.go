package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

// OrderItem represents a single ordered food item
type OrderItem struct {
	ID    int    `json:"id,omitempty"`
	Name  string `json:"name"`
	Emoji string `json:"emoji,omitempty"`
	Qty   int    `json:"qty"`
	Price int    `json:"price,omitempty"`
}

// Order represents a complete student food order
type Order struct {
	OrderID         string      `json:"orderId"`
	Student         string      `json:"student"`
	StudentUsername string      `json:"studentUsername,omitempty"`
	StudentRollNo   string      `json:"studentRollNo,omitempty"`
	Items           []OrderItem `json:"items"`
	Subtotal        float64     `json:"subtotal,omitempty"`
	GST             float64     `json:"gst,omitempty"`
	Total           float64     `json:"total"`
	PlacedAt        string      `json:"placedAt"`
	Status          string      `json:"status"` // "pending" or "served"
	ServedAt        string      `json:"servedAt,omitempty"`
	ServedBy        string      `json:"servedBy,omitempty"`
	QRData          string      `json:"qrData,omitempty"`
}

// Store holds the in-memory orders with file persistence
type Store struct {
	mu           sync.RWMutex
	activeOrders map[string]Order // Pending orders
	servedOrders map[string]Order // Served orders history
	dataFile     string
}

func NewStore(dataFile string) *Store {
	s := &Store{
		activeOrders: make(map[string]Order),
		servedOrders: make(map[string]Order),
		dataFile:     dataFile,
	}
	s.loadFromFile()
	return s
}

func (s *Store) loadFromFile() {
	s.mu.Lock()
	defer s.mu.Unlock()

	data, err := os.ReadFile(s.dataFile)
	if err != nil {
		return // File doesn't exist yet, that's fine
	}
	var dump struct {
		Active map[string]Order `json:"active"`
		Served map[string]Order `json:"served"`
	}
	if err := json.Unmarshal(data, &dump); err == nil {
		if dump.Active != nil {
			s.activeOrders = dump.Active
		}
		if dump.Served != nil {
			s.servedOrders = dump.Served
		}
	}
}

func (s *Store) saveToFile() {
	dump := struct {
		Active map[string]Order `json:"active"`
		Served map[string]Order `json:"served"`
	}{
		Active: s.activeOrders,
		Served: s.servedOrders,
	}
	data, err := json.MarshalIndent(dump, "", "  ")
	if err == nil {
		_ = os.WriteFile(s.dataFile, data, 0644)
	}
}

func (s *Store) CreateOrder(o Order) Order {
	s.mu.Lock()
	defer s.mu.Unlock()

	if o.PlacedAt == "" {
		o.PlacedAt = time.Now().UTC().Format(time.RFC3339)
	}
	o.Status = "pending"
	s.activeOrders[o.OrderID] = o
	s.saveToFile()
	return o
}

func (s *Store) GetOrder(id string) (Order, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	// Check active first
	if o, ok := s.activeOrders[id]; ok {
		return o, true
	}
	// Check served
	if o, ok := s.servedOrders[id]; ok {
		return o, true
	}
	return Order{}, false
}

func (s *Store) MarkServed(id string, servedBy string) (Order, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()

	// If already in served
	if o, ok := s.servedOrders[id]; ok {
		return o, true
	}

	// Move from active to served (per user request: delete from active once served)
	if o, ok := s.activeOrders[id]; ok {
		delete(s.activeOrders, id) // Deleted from active data once served!
		o.Status = "served"
		o.ServedAt = time.Now().UTC().Format(time.RFC3339)
		if servedBy != "" {
			o.ServedBy = servedBy
		} else {
			o.ServedBy = "Staff"
		}
		s.servedOrders[id] = o
		s.saveToFile()
		return o, true
	}

	return Order{}, false
}

func (s *Store) ListServed() []Order {
	s.mu.RLock()
	defer s.mu.RUnlock()

	list := make([]Order, 0, len(s.servedOrders))
	for _, o := range s.servedOrders {
		list = append(list, o)
	}
	return list
}

func (s *Store) DeleteServed(id string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, ok := s.servedOrders[id]; ok {
		delete(s.servedOrders, id)
		s.saveToFile()
		return true
	}
	return false
}

func (s *Store) ClearAllServed() {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.servedOrders = make(map[string]Order)
	s.saveToFile()
}

// Enable CORS for cross-device requests (GitHub Pages / phone / laptop)
func enableCORS(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}
		next(w, r)
	}
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	dataFile := filepath.Join(".", "data_orders.json")
	store := NewStore(dataFile)

	mux := http.NewServeMux()

	// ── POST /api/orders (Student creates order)
	mux.HandleFunc("/api/orders", enableCORS(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost {
			var o Order
			if err := json.NewDecoder(r.Body).Decode(&o); err != nil {
				http.Error(w, `{"error":"invalid json"}`, http.StatusBadRequest)
				return
			}
			if o.OrderID == "" {
				o.OrderID = fmt.Sprintf("ORD-%s-%04d", time.Now().Format("20060102"), time.Now().UnixNano()%10000)
			}
			created := store.CreateOrder(o)
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusCreated)
			_ = json.NewEncoder(w).Encode(created)
			return
		}
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}))

	// ── GET /api/orders/ & POST /api/orders/:id/serve
	mux.HandleFunc("/api/orders/", enableCORS(func(w http.ResponseWriter, r *http.Request) {
		path := strings.TrimPrefix(r.URL.Path, "/api/orders/")
		parts := strings.Split(path, "/")
		orderID := parts[0]

		if orderID == "" {
			http.Error(w, "Order ID required", http.StatusBadRequest)
			return
		}

		// POST /api/orders/:id/serve
		if len(parts) >= 2 && parts[1] == "serve" && r.Method == http.MethodPost {
			var body struct {
				ServedBy string `json:"servedBy"`
			}
			_ = json.NewDecoder(r.Body).Decode(&body)

			order, ok := store.MarkServed(orderID, body.ServedBy)
			w.Header().Set("Content-Type", "application/json")
			if !ok {
				// Create on the fly if served directly from QR code payload
				w.WriteHeader(http.StatusOK)
				_ = json.NewEncoder(w).Encode(map[string]interface{}{
					"status":  "served",
					"orderId": orderID,
					"message": "Marked served & deleted from active",
				})
				return
			}
			_ = json.NewEncoder(w).Encode(order)
			return
		}

		// GET /api/orders/:id
		if r.Method == http.MethodGet {
			order, ok := store.GetOrder(orderID)
			w.Header().Set("Content-Type", "application/json")
			if !ok {
				w.WriteHeader(http.StatusNotFound)
				_ = json.NewEncoder(w).Encode(map[string]string{"error": "order not found"})
				return
			}
			_ = json.NewEncoder(w).Encode(order)
			return
		}

		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}))

	// ── GET /api/served & DELETE /api/served
	mux.HandleFunc("/api/served", enableCORS(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		if r.Method == http.MethodGet {
			list := store.ListServed()
			_ = json.NewEncoder(w).Encode(list)
			return
		}
		if r.Method == http.MethodDelete {
			store.ClearAllServed()
			_ = json.NewEncoder(w).Encode(map[string]string{"message": "all served records cleared"})
			return
		}
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}))

	// ── DELETE /api/served/:id
	mux.HandleFunc("/api/served/", enableCORS(func(w http.ResponseWriter, r *http.Request) {
		orderID := strings.TrimPrefix(r.URL.Path, "/api/served/")
		if r.Method == http.MethodDelete && orderID != "" {
			store.DeleteServed(orderID)
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(map[string]string{"message": "served record deleted"})
			return
		}
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}))

	// ── Serve Frontend Static Files (root directory)
	staticDir := ".."
	if _, err := os.Stat("index.html"); err == nil {
		staticDir = "."
	}
	fileServer := http.FileServer(http.Dir(staticDir))
	mux.Handle("/", fileServer)

	addr := ":" + port
	fmt.Printf("\n🚀 CampusBite Go Server running at: http://localhost%s\n", addr)
	fmt.Printf("📂 Serving canteen frontend & cross-device sync API\n")
	fmt.Printf("   Student Portal: http://localhost%s/student/login.html\n", addr)
	fmt.Printf("   Staff Portal:   http://localhost%s/staff/login.html\n\n", addr)

	if err := http.ListenAndServe(addr, mux); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}

