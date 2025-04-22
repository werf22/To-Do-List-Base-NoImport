'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Task } from '@prisma/client';
import { TASK_FIELD_CONFIG } from '@/config/TASK_FIELD_CONFIG';
import MultiSelect from '@/components/ui/MultiSelect';
import Select from '@/components/ui/Select';

// Type of the parameters received by the page component
interface TaskDetailPageProps {
  params: {
    id: string;
  };
}

export default function TaskDetailPage({ params }: TaskDetailPageProps) {
  const router = useRouter();
  const { id } = params;

  // State for the task data, loading status, error, and edit mode
  const [task, setTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTask, setEditedTask] = useState<Partial<Task>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch the task data when the component mounts
  useEffect(() => {
    async function fetchTask() {
      setIsLoading(true);
      setError(null);
      try {
        console.log(`Fetching task ${id}...`);
        const response = await fetch(`/api/tasks/${id}`);
        
        if (!response.ok) {
          let errorMsg = `HTTP error! status: ${response.status} ${response.statusText}`;
          try {
            const errorData = await response.json();
            errorMsg = errorData.error || errorMsg;
          } catch (jsonError) {
            console.warn("Could not parse error response as JSON:", jsonError);
          }
          throw new Error(errorMsg);
        }
        
        const data = await response.json();
        console.log("Task fetched:", data);
        setTask(data);
        setEditedTask(data); // Initialize edited task with current data
      } catch (e: any) {
        console.error(`Error fetching task ${id}:`, e);
        setError(`Failed to load task. ${e.message || 'Please try again later.'}`);
        setTask(null);
      } finally {
        setIsLoading(false);
      }
    }
    
    if (id) {
      fetchTask();
    }
  }, [id]);

  // Handle field change in edit mode
  const handleFieldChange = (fieldName: string, value: any) => {
    console.log(`Changing field ${fieldName} to:`, value);
    setEditedTask((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  // Save changes to the task
  const handleSave = async () => {
    if (!task || !editedTask) return;
    
    setIsSaving(true);
    setSaveError(null);
    
    try {
      console.log(`Saving changes to task ${id}...`);
      
      // Process multi-select fields before sending to backend
      const processedTask = { ...editedTask };
      
      // Helper function to properly split comma-separated values with quotes
      const splitCsvWithQuotes = (str: string): string[] => {
        if (!str) return [];
        
        const result: string[] = [];
        let currentValue = '';
        let insideQuotes = false;
        
        for (let i = 0; i < str.length; i++) {
          const char = str[i];
          
          if (char === '"') {
            // Toggle quote state
            insideQuotes = !insideQuotes;
          } else if (char === ',' && !insideQuotes) {
            // End of value (only if not inside quotes)
            result.push(currentValue.trim());
            currentValue = '';
          } else {
            // Add character to current value
            currentValue += char;
          }
        }
        
        // Add the last value
        if (currentValue.trim()) {
          result.push(currentValue.trim());
        }
        
        // Remove any surrounding quotes from values
        return result.map(item => {
          const trimmed = item.trim();
          if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
            return trimmed.slice(1, -1).trim();
          }
          return trimmed;
        }).filter(Boolean);
      };
      
      // Fields that should be arrays
      const arrayFields = [
        'portfolio', 'project', 'section', 'tags', 'desired_output_format', 
        'desired_style_tone', 'ai_action_process_dropdown', 'required_tools_software',
        'required_hardware', 'required_skills', 'required_devices',
        'optimal_time_of_day', 'related_portfolios', 'related_projects',
        'related_sections', 'related_entities'
      ];
      
      // Special hierarchical fields (portfolio, project, section)
      // These have a concept of "primary" value (first in array), but should be stored consistently
      const hierarchyFields = ['portfolio', 'project', 'section'];
      
      // Ensure array fields are properly formatted
      arrayFields.forEach(field => {
        if (field in processedTask) {
          const value = processedTask[field as keyof typeof processedTask];
          
          // For hierarchy fields (portfolio, project, section), ensure the first value is preserved
          // but still send all values as a proper array
          if (hierarchyFields.includes(field) && value !== null && value !== undefined) {
            console.log(`Processing hierarchy field ${field}:`, value);
            
            let arrayValue: string[] = [];
            
            // Convert to array if it's a string
            if (typeof value === 'string') {
              // Use proper CSV parsing that respects quotes
              arrayValue = splitCsvWithQuotes(value);
            } else if (Array.isArray(value)) {
              arrayValue = [...value]; // Create a copy to avoid modifying the original
            }
            
            // Ensure at least one value if it's a hierarchy field
            if (arrayValue.length === 0 && typeof value === 'string' && value.trim()) {
              arrayValue = [value.trim()];
            }
            
            console.log(`Processed hierarchy field ${field} to:`, arrayValue);
            (processedTask as any)[field] = arrayValue;
          } 
          // For regular multi-select fields
          else if (Array.isArray(value)) {
            // Keep arrays as arrays
            console.log(`Field ${field} is already an array:`, value);
          } else if (typeof value === 'string' && value) {
            // Convert string to array with quote-aware CSV parsing
            console.log(`Converting string ${field} to array:`, value);
            (processedTask as any)[field] = splitCsvWithQuotes(value);
          } else if (value === null || value === undefined) {
            // Use empty array for null/undefined
            console.log(`Setting empty array for ${field}`);
            (processedTask as any)[field] = [];
          }
        }
      });
      
      console.log("Processed task data:", processedTask);
      
      const response = await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(processedTask),
      });
      
      if (!response.ok) {
        let errorMsg = `HTTP error! status: ${response.status} ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMsg = errorData.error || errorMsg;
        } catch (jsonError) {
          console.warn("Could not parse error response as JSON:", jsonError);
        }
        throw new Error(errorMsg);
      }
      
      const updatedTask = await response.json();
      console.log("Task updated:", updatedTask);
      setTask(updatedTask);
      setEditedTask(updatedTask);
      setIsEditing(false);
    } catch (e: any) {
      console.error(`Error updating task ${id}:`, e);
      setSaveError(`Failed to save changes. ${e.message || 'Please try again later.'}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Delete the task
  const handleDelete = async () => {
    console.log('[handleDelete] Clicked'); // <-- Log: Click detected
    if (!task) {
      console.log('[handleDelete] No task loaded, exiting.');
      return;
    }

    console.log(`[handleDelete] Prompting user for task: ${task.name} (ID: ${id})`);
    if (window.confirm(`Are you sure you want to delete task "${task.name}"? This action cannot be undone.`)) {
      console.log('[handleDelete] User confirmed deletion.'); // <-- Log: Confirmation received
      setIsDeleting(true);
      setSaveError(null); // Clear previous errors
      try {
        console.log(`[handleDelete] Sending DELETE request to /api/tasks/${id}`); // <-- Log: Fetch initiated
        const response = await fetch(`/api/tasks/${id}`, {
          method: 'DELETE',
        });

        console.log(`[handleDelete] Received response status: ${response.status}`); // <-- Log: Response status

        if (!response.ok) {
          let errorMsg = `HTTP error! status: ${response.status} ${response.statusText}`;
          try {
            const errorData = await response.json();
            console.log('[handleDelete] Error response body:', errorData); // <-- Log: Error body
            errorMsg = errorData.error || errorMsg;
          } catch (jsonError) {
            console.warn("[handleDelete] Could not parse error response as JSON:", jsonError);
          }
          throw new Error(errorMsg);
        }

        console.log(`[handleDelete] Task ${id} deleted successfully via API.`);
        router.push('/'); // Redirect to home page after successful deletion

      } catch (e: any) {
        console.error(`[handleDelete] Error during deletion API call:`, e);
        setSaveError(`Failed to delete task. ${e.message || 'Please try again later.'}`); // Reuse saveError state
      } finally {
        console.log('[handleDelete] Resetting isDeleting state.');
        setIsDeleting(false);
      }
    } else {
      console.log('[handleDelete] User cancelled deletion.'); // <-- Log: Confirmation cancelled
    }
  };

  // Cancel editing and revert changes
  const handleCancel = () => {
    setEditedTask(task || {});
    setIsEditing(false);
    setSaveError(null);
  };

  // Helper function to format field values for display
  const formatFieldValue = (fieldName: string, value: any): string => {
    if (value === null || value === undefined) return 'N/A';
    
    // Handle different types of values
    if (Array.isArray(value)) {
      // Always join arrays with comma for display
      return value.join(', ');
    } else if (value instanceof Date) {
      return value.toLocaleDateString();
    } else if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
      // Format date string values
      const date = new Date(value);
      return isNaN(date.getTime()) ? value : date.toLocaleDateString();
    } else if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    } else if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    
    return String(value);
  };

  // Render field based on its type
  const renderField = (fieldName: string, fieldConfig: any) => {
    const value = isEditing ? editedTask[fieldName as keyof Task] : task?.[fieldName as keyof Task];

    // Special case for task_id to show generated ID if not set
    if (fieldName === 'task_id') {
      // Instead of complex formatting, try to get numerical value from ID or index
      const displayTaskId = task?.task_id || '0';
      
      if (isEditing) {
        return (
          <input
            type="text"
            value={editedTask.task_id || displayTaskId}
            onChange={(e) => handleFieldChange('task_id', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md"
            placeholder="Enter task ID (e.g., 0, 1, 2...)"
          />
        );
      } else {
        return (
          <div className="p-2 bg-gray-50 rounded-md break-words">
            {displayTaskId}
          </div>
        );
      }
    }
    
    if (isEditing) {
      // Render input field based on the field type
      switch (fieldConfig.type) {
        case 'textarea':
          return (
            <textarea
              value={value as string || ''}
              onChange={(e) => handleFieldChange(fieldName, e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md"
              rows={5}
            />
          );
        case 'dropdown':
          return (
            <Select
              label=""
              value={value as string || ''}
              onChange={(newValue) => handleFieldChange(fieldName, newValue)}
              options={fieldConfig.options || []}
              placeholder={`Select ${fieldConfig.label}...`}
            />
          );
        case 'multi-select':
          // For multi-select fields, ensure value is always an array
          let arrayValue: string[] = [];
          if (Array.isArray(value)) {
            // Already an array, use as is
            arrayValue = value;
          } else if (typeof value === 'string' && value) {
            // Only use comma as the delimiter for multi-select values
            arrayValue = value.split(',').map(item => item.trim()).filter(Boolean);
          }
          
          // Get appropriate options based on field config
          let options = fieldConfig.options || [];
          if (fieldConfig.getOptions) {
            // Handle both string and string[] types for portfolio and project
            const selectedPortfolios = Array.isArray(editedTask.portfolio)
              ? editedTask.portfolio.join(',')
              : typeof editedTask.portfolio === 'string' 
                ? editedTask.portfolio 
                : '';
            
            const selectedProjects = Array.isArray(editedTask.project)
              ? editedTask.project.join(',')
              : typeof editedTask.project === 'string' 
                ? editedTask.project 
                : '';
            
            options = fieldConfig.getOptions(selectedPortfolios, selectedProjects);
          }
          
          return (
            <MultiSelect
              label=""
              value={arrayValue}
              onChange={(newValue) => handleFieldChange(fieldName, newValue)}
              options={options}
              placeholder={`Select ${fieldConfig.label}...`}
            />
          );
        case 'date':
          return (
            <input
              type="date"
              value={value instanceof Date 
                ? value.toISOString().split('T')[0] 
                : typeof value === 'string' && value 
                  ? new Date(value).toISOString().split('T')[0] 
                  : ''}
              onChange={(e) => handleFieldChange(fieldName, e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md"
            />
          );
        case 'number':
          return (
            <input
              type="number"
              value={value as number || ''}
              onChange={(e) => handleFieldChange(fieldName, e.target.valueAsNumber || null)}
              className="w-full p-2 border border-gray-300 rounded-md"
            />
          );
        default: // text
          return (
            <input
              type="text"
              value={value as string || ''}
              onChange={(e) => handleFieldChange(fieldName, e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md"
            />
          );
      }
    } else {
      // Display the field value in read-only mode
      return (
        <div className="p-2 bg-gray-50 rounded-md break-words">
          {fieldName === 'notes' || fieldName === 'description' || fieldName === 'task_comments' ? (
            <div className="whitespace-pre-wrap">{value ? String(value) : 'N/A'}</div>
          ) : (
            formatFieldValue(fieldName, value)
          )}
        </div>
      );
    }
  };

  // Group fields by category for organized display
  const fieldGroups = {
    'Core Information': ['task_id', 'name', 'description', 'notes', 'task_comments'],
    'Hierarchy & Categorization': ['portfolio', 'project', 'section', 'parent_task', 'parent_task_id'],
    'Subtasks & Dependencies': [
      'subtasks_for_user', 'subtasks_for_ai', 'subtasks_in_system', 'subtasks_id_in_system',
      'dependents', 'dependents_id', 'outgoing_dependents', 'outgoing_dependents_id',
      'related_tasks', 'related_tasks_id'
    ],
    'Tagging & Attributes': [
      'tags', 'priority', 'due_date', 'start_date', 'deadline_type',
      'recurrence_frequency', 'created_at', 'completed_at', 'last_modified_at'
    ],
    'AI Workflow & Control': [
      'ai_workflow_status', 'allow_autonomous_execution', 'ai_behavior_on_uncertainty', 
      'ai_creativity_level', 'ai_processing_priority', 'ai_agent_status_log',
      'number_of_variations', 'feedback_for_ai', 'ai_output_rating', 'ai_output_result_link',
      'action_required_from_user'
    ],
    'AI Input & Context': [
      'task_goal', 'input_data_context', 'desired_output_format', 'desired_style_tone',
      'specific_constraints_instructions', 'ai_action_process_free_text', 'ai_action_process_dropdown',
      'ai_brainstorm_ideas_on_how_it_can_help_me'
    ],
    'User Context & Requirements': [
      'task_type', 'estimated_user_time', 'cognitive_load', 'energy_level_required',
      'required_tools_software', 'required_hardware', 'required_skills', 'location',
      'execution_location', 'required_devices', 'internet_requirement', 'focus_requirement',
      'optimal_time_of_day'
    ],
    'Relationships & Impact': [
      'related_portfolios', 'related_projects', 'related_sections', 'related_entities',
      'target_audience', 'task_purpose', 'expected_impact_success_metric', 'waiting_for'
    ],
    'Financials': [
      'estimated_cost_budget', 'financial_return_value_speed', 'financial_aspect'
    ],
    'Input-Only Fields': [
      'suggested_initial_steps_subtasks', 'related_areas_for_ai_to_consider', 
      'potential_dependencies_related_tasks'
    ]
  };

  // If loading
  if (isLoading) {
    return (
      <div className="container mx-auto max-w-4xl p-4 md:p-6 lg:p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Loading Task...</h1>
          <Link 
            href="/"
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition"
          >
            Back to List
          </Link>
        </div>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6 mb-4"></div>
        </div>
      </div>
    );
  }

  // If error
  if (error) {
    return (
      <div className="container mx-auto max-w-4xl p-4 md:p-6 lg:p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Error</h1>
          <Link 
            href="/"
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition"
          >
            Back to List
          </Link>
        </div>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error:</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      </div>
    );
  }

  // If no task
  if (!task) {
    return (
      <div className="container mx-auto max-w-4xl p-4 md:p-6 lg:p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Task Not Found</h1>
          <Link 
            href="/"
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition"
          >
            Back to List
          </Link>
        </div>
        <p>The requested task does not exist or has been deleted.</p>
      </div>
    );
  }

  // Main render with task data
  return (
    <div className="container mx-auto max-w-4xl p-4 md:p-6 lg:p-8">
      {/* Header with task name and actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-800 break-words">{task.name}</h1>
        <div className="flex space-x-3">
          {isEditing ? (
            <>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className={`px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                onClick={handleCancel}
                disabled={isSaving}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
              >
                Edit Task
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className={`px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition ${isDeleting ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isDeleting ? 'Deleting...' : 'Delete Task'}
              </button>
              <Link 
                href="/"
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition"
              >
                Back to List
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Save error message */}
      {saveError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6" role="alert">
          <strong className="font-bold">Error saving changes:</strong>
          <span className="block sm:inline"> {saveError}</span>
        </div>
      )}

      {/* Task status */}
      <div className="mb-6 flex flex-wrap gap-2">
        {task.ai_workflow_status && (
          <span className={`px-3 py-1 rounded-full font-medium text-sm ${
            task.ai_workflow_status.startsWith('1') ? 'bg-gray-100 text-gray-700' :
            task.ai_workflow_status.startsWith('2') ? 'bg-yellow-100 text-yellow-700' :
            task.ai_workflow_status.startsWith('3') ? 'bg-blue-100 text-blue-700' :
            task.ai_workflow_status.startsWith('4') ? 'bg-purple-100 text-purple-700' :
            task.ai_workflow_status.startsWith('5') ? 'bg-pink-100 text-pink-700 font-bold' :
            task.ai_workflow_status.startsWith('6') ? 'bg-green-100 text-green-700' :
            task.ai_workflow_status.startsWith('7') ? 'bg-gray-300 text-gray-600' :
            'bg-gray-100 text-gray-700'
          }`}
          >
            {task.ai_workflow_status}
          </span>
        )}
        {task.priority && (
          <span className={`px-3 py-1 rounded-full font-medium text-sm ${
            task.priority.startsWith('P0') ? 'bg-red-100 text-red-800' :
            task.priority.startsWith('P1') ? 'bg-orange-100 text-orange-800' :
            task.priority.startsWith('P2') ? 'bg-yellow-100 text-yellow-800' :
            task.priority.startsWith('P3') ? 'bg-blue-100 text-blue-800' :
            'bg-gray-100 text-gray-800'
          }`}
          >
            {task.priority}
          </span>
        )}
        {task.due_date && (
          <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full font-medium text-sm">
            Due: {new Date(task.due_date).toLocaleDateString()}
          </span>
        )}
      </div>

      {/* Field groups with collapsible sections */}
      <div className="space-y-6">
        {Object.entries(fieldGroups).map(([groupName, fieldNames]) => (
          <div key={groupName} className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 font-medium text-gray-700">
              {groupName}
            </div>
            <div className="p-4">
              <div className="grid grid-cols-1 gap-4">
                {fieldNames.map(fieldName => {
                  if (!TASK_FIELD_CONFIG[fieldName]) return null;
                  
                  return (
                    <div key={fieldName} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                      <div className="flex flex-col">
                        <label className="font-medium text-gray-700 mb-1">
                          {TASK_FIELD_CONFIG[fieldName].label}
                          {TASK_FIELD_CONFIG[fieldName].description && (
                            <span className="ml-2 text-xs font-normal text-gray-500">
                              {TASK_FIELD_CONFIG[fieldName].description}
                            </span>
                          )}
                        </label>
                        {renderField(fieldName, TASK_FIELD_CONFIG[fieldName])}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
