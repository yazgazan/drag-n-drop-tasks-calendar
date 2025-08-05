# Todoist API Migration Plan: REST API v2 → API v1

This document outlines the migration plan from the deprecated Todoist REST API v2 to the new unified Todoist API v1. The current codebase uses REST API v2 which is deprecated and will be removed. The new API v1 provides improved functionality, better error handling, and more consistent data structures.

## Current State Analysis

### Current API Implementation
- **API Version**: REST API v2 (deprecated)
- **Base URL**: `https://api.todoist.com/rest/v2`
- **Authentication**: Bearer token with personal API tokens
- **Implementation**: Custom API client in `src/services/todoist-api.ts`
- **Key Files**: 
  - `src/services/todoist-api.ts` - Main API client
  - `src/services/auth.ts` - Token management
  - `src/types/task.ts` - Type definitions

### Current API Usage
- `GET /rest/v2/tasks` - Fetch all tasks
- `POST /rest/v2/tasks` - Create new task
- `POST /rest/v2/tasks/{id}` - Update existing task (using POST)
- `DELETE /rest/v2/tasks/{id}` - Delete task
- `GET /rest/v2/projects` - Fetch projects
- `GET /rest/v2/labels` - Fetch labels

## Target State: Todoist API v1

### New API Features
- **Base URL**: `https://api.todoist.com/api/v1/sync`
- **Authentication**: Bearer token (personal API tokens still supported)
- **Sync-based approach**: More efficient data synchronization
- **Batch operations**: Support for multiple operations in single request
- **Improved error handling**: More detailed error responses
- **Consistent data structures**: Standardized field naming and types

## Migration Plan

### Phase 1: Preparation and Analysis
- [ ] Review official Todoist API v1 documentation
- [ ] Analyze breaking changes and data structure differences
- [ ] Set up testing environment with API v1

### Phase 2: Update Base Infrastructure
- [ ] Update base URL and endpoint structure in `src/services/todoist-api.ts`
  - Change base URL to `https://api.todoist.com/api/v1/sync`
  - Update authentication headers if needed
- [ ] Update error handling for new API response format
- [ ] Implement sync token management for incremental updates

### Phase 3: Migrate Core API Methods

#### Tasks API Migration
- [ ] **getTasks()**: Migrate to sync-based task fetching
  - Current: `GET /rest/v2/tasks`
  - New: `POST /api/v1/sync` with `resource_types: ["items"]`
- [ ] **createTask()**: Update task creation
  - Current: `POST /rest/v2/tasks`
  - New: Use sync commands with `item_add` command
- [ ] **updateTask()**: Migrate task updates
  - Current: `POST /rest/v2/tasks/{id}`
  - New: Use sync commands with `item_update` command
- [ ] **deleteTask()**: Update task deletion
  - Current: `DELETE /rest/v2/tasks/{id}`
  - New: Use sync commands with `item_delete` command
- [ ] **clearTaskDueDate()**: Update due date clearing logic

#### Projects and Labels API Migration
- [ ] **getProjects()**: Migrate to sync-based project fetching
  - Current: `GET /rest/v2/projects`
  - New: `POST /api/v1/sync` with `resource_types: ["projects"]`
- [ ] **getLabels()**: Migrate to sync-based label fetching
  - Current: `GET /rest/v2/labels`
  - New: `POST /api/v1/sync` with `resource_types: ["labels"]`

### Phase 4: Update Data Types and Structures
- [ ] Update `src/types/task.ts` for API v1 data structures
  - Review field name changes (if any)
  - Update priority system if changed
  - Verify date/time format consistency
- [ ] Update task transformation logic in components
- [ ] Ensure backward compatibility during transition

### Phase 5: Implement Sync Functionality
- [ ] Add sync token management
  - Store and update sync tokens for incremental updates
  - Implement full sync vs incremental sync logic
- [ ] Implement batch command processing
  - Group multiple operations into single sync request
  - Handle temporary IDs for complex operations
- [ ] Add optimistic updates with rollback capability

### Phase 6: Testing and Validation
- [ ] Update test cases for new API endpoints
- [ ] Test authentication flow with API v1
- [ ] Validate data transformation and type safety
- [ ] Test error handling and edge cases
- [ ] Performance testing for sync operations

## Implementation Details

### New API Client Structure
```typescript
export class TodoistApi {
  private static readonly BASE_URL = 'https://api.todoist.com/api/v1/sync';
  private static syncToken: string = '*'; // Start with full sync
  
  // Sync-based data fetching
  static async sync(resourceTypes: string[] = ['all']): Promise<SyncResponse> {
    return this.makeRequest<SyncResponse>('/sync', {
      method: 'POST',
      body: JSON.stringify({
        sync_token: this.syncToken,
        resource_types: resourceTypes
      })
    });
  }
  
  // Command-based operations
  static async executeCommands(commands: Command[]): Promise<SyncResponse> {
    return this.makeRequest<SyncResponse>('/sync', {
      method: 'POST',
      body: JSON.stringify({
        sync_token: this.syncToken,
        commands: commands
      })
    });
  }
}
```

### Command Structure Examples
```typescript
// Create task command
const createTaskCommand = {
  type: 'item_add',
  uuid: generateUUID(),
  args: {
    content: 'New task',
    project_id: 'project123',
    due: { date: '2024-01-15' }
  }
};

// Update task command
const updateTaskCommand = {
  type: 'item_update',
  uuid: generateUUID(),
  args: {
    id: 'task123',
    content: 'Updated task content'
  }
};
```

### Error Handling Updates
```typescript
// Enhanced error handling for API v1
private static async handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    
    // API v1 provides more detailed error information
    const errorMessage = errorData.error_code 
      ? `${errorData.error}: ${errorData.error_extra || ''}`
      : `API request failed: ${response.statusText}`;
      
    throw new TodoistApiError(errorMessage, response.status, errorData);
  }
  
  return response.json();
}
```

## Breaking Changes to Address

1. **API Endpoints**: Complete restructure from REST to sync-based endpoints
2. **Request Methods**: Shift from REST verbs to command-based operations
3. **Data Synchronization**: Implement sync token management
4. **Batch Operations**: Support for multiple operations in single request
5. **Error Responses**: Updated error format and codes
6. **Field Names**: Verify any field name changes in API responses

## Success Criteria

- [ ] All existing functionality works with API v1
- [ ] Improved performance through sync-based operations
- [ ] Enhanced error handling and user feedback
- [ ] Successful integration tests pass

## Resources and References

- [Todoist API v1 Documentation](https://developer.todoist.com/api/v1/)
- [Sync API Reference](https://developer.todoist.com/api/v1/#sync)
- [Commands Reference](https://developer.todoist.com/api/v1/#commands)
- [Authentication Guide](https://developer.todoist.com/api/v1/#authorization)

## Notes

- Personal API tokens will continue to work with API v1 (no OAuth migration needed)
- The new sync-based approach will provide better performance and data consistency
- Batch operations will reduce API call frequency and improve user experience
- Enhanced error handling will provide better debugging and user feedback