#include <stdio.h>
#include <stdlib.h>
#include <time.h>
#include <limits.h>

/**
 * PROJECT: Delivery Route Optimizer
 * DESCRIPTION: Implementation of Traveling Salesman Problem (TSP) using 
 *             Brute Force, Greedy, and Dynamic Programming.
 * 
 * APPROACHES:
 * 1. BRUTE FORCE: O(n!) - Explores all (n-1)! permutations of cities starting from city 0.
 * 2. GREEDY (Nearest Neighbor): O(n^2) - Picks the closest unvisited city at each step.
 * 3. DYNAMIC PROGRAMMING (Held-Karp): O(n^2 * 2^n) - Uses bitmasking and memoization 
 *    to avoid recomputing subproblems.
 * 
 * --- DAA CONCEPTS EXPLAINED ---
 * 1. BACKTRACKING: Used in Brute Force. It explores all possible permutations but 
 *    can be pruned if current cost exceeds the best found. Here we show basic O(n!).
 * 2. GREEDY CHOICE PROPERTY: In Greedy, we make the locally best choice (closest city) 
 *    hoping it leads to a global optimum. Note: This fails if the nearest neighbor 
 *    forces a very long return jump at the end.
 * 3. OPTIMAL SUBSTRUCTURE: TSP has optimal substructure because the shortest path 
 *    to visit a set of cities S ending at j depends on the shortest path to visit 
 *    S-{j} ending at some i.
 * 4. OVERLAPPING SUBPROBLEMS: Many recursive calls in TSP visit the same subset 
 *    of cities. DP stores these results in a memoization table (dp[mask][pos]).
 * 5. BITMASKING: A way to represent sets using bits. If n=5, a mask 10110 (binary) 
 *    means cities 1, 2, and 4 have been visited.
 */

#define MAX_CITIES 12
#define INF 1e9

int n;
int dist[MAX_CITIES][MAX_CITIES];

// Global variables for Brute Force
int best_path_bf[MAX_CITIES + 1];
int current_path_bf[MAX_CITIES + 1];
int visited_bf[MAX_CITIES];
double min_cost_bf;

// Global variables for DP
double dp[1 << MAX_CITIES][MAX_CITIES];
int parent[1 << MAX_CITIES][MAX_CITIES];

// Utility function to print a route
void printRoute(int* path, int length) {
    for (int i = 0; i < length; i++) {
        printf("%d%s", path[i], (i == length - 1) ? "" : " -> ");
    }
    printf("\n");
}

// Default sample data initialization
void initSampleData() {
    n = 5;
    int sample[5][5] = {
        {0, 20, 30, 10, 11},
        {15, 0, 16, 4, 2},
        {3, 5, 0, 2, 4},
        {19, 6, 18, 0, 3},
        {16, 4, 7, 16, 0}
    };
    for (int i = 0; i < n; i++)
        for (int j = 0; j < n; j++)
            dist[i][j] = sample[i][j];
}

void inputDistances() {
    printf("Enter number of cities (max %d): ", MAX_CITIES);
    scanf("%d", &n);
    if (n > MAX_CITIES) n = MAX_CITIES;
    printf("Enter distance matrix (%d x %d):\n", n, n);
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < n; j++) {
            scanf("%d", &dist[i][j]);
        }
    }
}

// ---------------------------------------------------------
// 1. BRUTE FORCE APPROACH
// ---------------------------------------------------------
/**
 * Concept: Backtracking / Recursion
 * Time Complexity: O(n!)
 * Space Complexity: O(n)
 */
void bruteForceRecursive(int curr, int count, double cost) {
    // Base Case: All cities visited, return to start
    if (count == n) {
        double total_cost = cost + dist[curr][0];
        if (total_cost < min_cost_bf) {
            min_cost_bf = total_cost;
            for (int i = 0; i < n; i++) best_path_bf[i] = current_path_bf[i];
            best_path_bf[n] = 0;
        }
        return;
    }

    // Try all unvisited cities
    for (int next = 0; next < n; next++) {
        if (!visited_bf[next]) {
            visited_bf[next] = 1;
            current_path_bf[count] = next;
            bruteForceRecursive(next, count + 1, cost + dist[curr][next]);
            visited_bf[next] = 0; // Backtrack
        }
    }
}

void runBruteForce() {
    printf("\n--- ALGORITHM: BRUTE FORCE (Backtracking) ---\n");
    min_cost_bf = INF;
    for (int i = 0; i < n; i++) visited_bf[i] = 0;
    
    visited_bf[0] = 1;
    current_path_bf[0] = 0;
    
    clock_t start = clock();
    bruteForceRecursive(0, 1, 0);
    clock_t end = clock();
    
    printf("Route: ");
    printRoute(best_path_bf, n + 1);
    printf("Total Cost: %.2f\n", min_cost_bf);
    printf("Execution Time: %.6f seconds\n", (double)(end - start) / CLOCKS_PER_SEC);
}

// ---------------------------------------------------------
// 2. GREEDY APPROACH (Nearest Neighbor)
// ---------------------------------------------------------
/**
 * Concept: Greedy Choice Property
 * Time Complexity: O(n^2)
 * Space Complexity: O(n)
 */
void runGreedy() {
    printf("\n--- ALGORITHM: GREEDY (Nearest Neighbor) ---\n");
    int visited[MAX_CITIES] = {0};
    int path[MAX_CITIES + 1];
    double total_cost = 0;
    
    clock_t start = clock();
    int curr = 0;
    path[0] = 0;
    visited[0] = 1;
    
    for (int step = 1; step < n; step++) {
        int nearest = -1;
        double min_dist = INF;
        
        for (int next = 0; next < n; next++) {
            if (!visited[next] && dist[curr][next] < min_dist) {
                min_dist = dist[curr][next];
                nearest = next;
            }
        }
        
        path[step] = nearest;
        visited[nearest] = 1;
        total_cost += min_dist;
        curr = nearest;
    }
    
    total_cost += dist[curr][0];
    path[n] = 0;
    clock_t end = clock();
    
    printf("Route: ");
    printRoute(path, n + 1);
    printf("Total Cost: %.2f\n", total_cost);
    printf("Execution Time: %.6f seconds\n", (double)(end - start) / CLOCKS_PER_SEC);
    printf("(Note: Greedy may not find the optimal solution)\n");
}

// ---------------------------------------------------------
// 3. DYNAMIC PROGRAMMING APPROACH (Held-Karp)
// ---------------------------------------------------------
/**
 * Concept: Optimal Substructure & Overlapping Subproblems
 * Bitmasking techniques are used to represent the set of visited cities.
 * Time Complexity: O(n^2 * 2^n)
 * Space Complexity: O(n * 2^n)
 */
double tsp_dp(int mask, int pos) {
    // If all cities are visited, return to start
    if (mask == (1 << n) - 1) {
        return dist[pos][0];
    }
    
    // Memoization
    if (dp[mask][pos] != -1) {
        return dp[mask][pos];
    }
    
    double min_res = INF;
    int best_next = -1;
    
    for (int next = 0; next < n; next++) {
        if (!(mask & (1 << next))) {
            double res = dist[pos][next] + tsp_dp(mask | (1 << next), next);
            if (res < min_res) {
                min_res = res;
                best_next = next;
            }
        }
    }
    
    parent[mask][pos] = best_next;
    return dp[mask][pos] = min_res;
}

/**
 * DP TABLE VISUALIZATION
 * Prints the memoization table for small n (n <= 5)
 */
void printDPTable() {
    if (n > 5) {
        printf("\n(DP table hidden: only shown for n <= 5 to avoid clutter)\n");
        return;
    }
    printf("\n--- DP TABLE (Mask vs Last City) ---\n");
    printf("Mask | ");
    for (int j = 0; j < n; j++) printf("City %d | ", j);
    printf("\n-----|---------|---------|---------|---------|---------|\n");
    
    for (int i = 0; i < (1 << n); i++) {
        printf("%4d | ", i);
        for (int j = 0; j < n; j++) {
            if (dp[i][j] == -1 || dp[i][j] >= INF)
                printf("  INF   | ");
            else
                printf("%7.1f | ", dp[i][j]);
        }
        printf("\n");
    }
}

void runDP(int suppress_output) {
    if(!suppress_output) printf("\n--- ALGORITHM: DYNAMIC PROGRAMMING (Held-Karp) ---\n");
    
    // Initialize DP table
    for (int i = 0; i < (1 << n); i++) {
        for (int j = 0; j < n; j++) {
            dp[i][j] = -1;
            parent[i][j] = -1;
        }
    }
    
    clock_t start = clock();
    double min_cost = tsp_dp(1, 0);
    
    // Path reconstruction
    int path[MAX_CITIES + 1];
    int mask = 1;
    int pos = 0;
    int idx = 0;
    
    while (pos != -1) {
        path[idx++] = pos;
        int next = parent[mask][pos];
        if (next == -1) break;
        mask |= (1 << next);
        pos = next;
    }
    path[idx++] = 0;
    clock_t end = clock();
    
    if (!suppress_output) {
        printf("Route: ");
        printRoute(path, idx);
        printf("Total Cost: %.2f\n", min_cost);
        printf("Execution Time: %.6f seconds\n", (double)(end - start) / CLOCKS_PER_SEC);
        printDPTable();
    }
}

int main() {
    int choice;
    initSampleData(); // Load default sample
    
    while (1) {
        printf("\n=============================================\n");
        printf("   DELIVERY ROUTE OPTIMIZER (TSP) MENU      \n");
        printf("=============================================\n");
        printf("1. Use Default Sample Data (%d cities)\n", n);
        printf("2. Enter Custom Distance Matrix\n");
        printf("3. Run Brute Force Approach\n");
        printf("4. Run Greedy Approach\n");
        printf("5. Run Dynamic Programming\n");
        printf("6. Run All and Compare\n");
        printf("7. Exit\n");
        printf("Choice: ");
        scanf("%d", &choice);
        
        switch (choice) {
            case 1: printf("Using default data.\n"); break;
            case 2: inputDistances(); break;
            case 3: runBruteForce(); break;
            case 4: runGreedy(); break;
            case 5: runDP(0); break;
            case 6:
                runBruteForce();
                runGreedy();
                runDP(0);
                printf("\n--- COMPARISON SUMMARY ---\n");
                printf("ALGORITHM          | COMPLEXITY  | OPTIMAL? | CHARACTERISTIC\n");
                printf("-------------------|-------------|----------|-------------------\n");
                printf("Brute Force (BT)   | O(n!)       | YES      | Exhaustive search\n");
                printf("Greedy (NN)        | O(n^2)      | NO       | Local-best choice\n");
                printf("Dynamic Programming| O(n^2 2^n)  | YES      | Memoization/Masking\n");
                break;
            case 7: exit(0);
            default: printf("Invalid choice!\n");
        }
    }
    
    return 0;
}
