// app/api/tasks/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma'; // Import the initialized Prisma Client instance
import { Task } from '@prisma/client'; // Import the generated Task type for type safety
import { getNextTaskId } from '@/lib/taskIdGenerator'; // Import the task ID generator

/**
 * Handles GET requests to fetch all tasks.
 * Retrieves tasks from the database, ordered by creation date descending.
 */
export async function GET() {
  console.log("GET /api/tasks called"); // Basic logging
  try {
    const tasks = await prisma.task.findMany({
      orderBy: {
        created_at: 'desc', // Order by newest first
      },
      // Consider adding pagination or limiting fields in a real application
      // select: { id: true, name: true, priority: true, due_date: true, ai_workflow_status: true }
    });
    console.log(`Fetched ${tasks.length} tasks`);
    return NextResponse.json(tasks);
  } catch (error) {
    console.error("API Error: Failed to fetch tasks:", error);
    // Provide a slightly more specific error message to the client
    let errorMessage = 'Internal Server Error: Could not fetch tasks.';
    if (error instanceof Error) {
      // You could potentially check for specific error types here,
      // but avoid sending raw database errors directly to the client.
      // For now, just indicate it might be a database issue.
      errorMessage = `Failed to fetch tasks. Potential database issue: ${error.message}`;
    }
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * Handles POST requests to create a new task.
 * Expects essential task details in the request body.
 * Saves the new task to the database.
 * Returns the newly created task data.
 */
export async function POST(request: Request) {
  console.log("POST /api/tasks called"); // Basic logging
  try {
    const body = await request.json();
    console.log("Request Body:", body);

    // --- Extract Expected Fields from MVP Form ---
    // Destructure only the fields you expect your simple MVP form to send.
    const {
      name,
      task_goal,
      input_data_context,
      // Optional fields potentially sent from an initial form:
      portfolio, // Expecting a single string value from MVP form for now
      project,   // Expecting a single string value
      section,   // Expecting a single string value
      priority,  // Expecting a single string value (e.g., "P3 - Medium")
      due_date,  // Expecting a date string (e.g., "YYYY-MM-DD")
      deadline_type, // Deadline type (Hard Deadline, Soft Deadline, etc.)
      start_date,  // Start date string
      // Add any other fields your MVP form might send explicitly
      suggested_initial_steps_subtasks,
      related_areas_for_ai_to_consider,
      potential_dependencies_related_tasks,
      financial_aspect,
      financial_return_value_speed,
      parent_task, // Name of parent
      parent_task_id, // ID of parent
      related_entity,
      desired_output_format,
      ai_action_process_free_text,
      ai_action_process_dropdown,
      specific_constraints_instructions,
      ai_behavior_on_uncertainty,
      ai_workflow_status,
      allow_autonomous_execution
    } = body;

    // --- Basic Input Validation ---
    if (!name || typeof name !== 'string' || name.trim() === '') {
      console.error("Validation Error: Missing or invalid 'name'");
      return NextResponse.json({ error: "Task 'name' is required and must be a non-empty string." }, { status: 400 });
    }
    if (!task_goal || typeof task_goal !== 'string' || task_goal.trim() === '') {
       console.error("Validation Error: Missing or invalid 'task_goal'");
      return NextResponse.json({ error: "Task 'Task Goal' is required and must be a non-empty string." }, { status: 400 });
    }
    if (!input_data_context || typeof input_data_context !== 'string' || input_data_context.trim() === '') {
      console.error("Validation Error: Missing or invalid 'input_data_context'");
      return NextResponse.json({ error: "Task 'Input Data & Context' is required and must be a non-empty string." }, { status: 400 });
    }

    // --- Prepare Data for Prisma ---
    const taskData: Partial<Task> = {
      name: name.trim(),
      task_goal: task_goal.trim(),
      input_data_context: input_data_context.trim(),
      
      // Will be set by getNextTaskId() before saving
      // task_id: '0', // Default value for first task - starting from 0
      
      // Handle multi-select fields correctly
      portfolio: Array.isArray(portfolio) ? portfolio : (portfolio ? [portfolio.trim()] : []),
      project: Array.isArray(project) ? project : (project ? [project.trim()] : []),
      section: Array.isArray(section) ? section : (section ? [section.trim()] : []),
      
      // Handle single-select fields
      priority: priority && typeof priority === 'string' ? priority.trim() : undefined,
      
      // Handle date fields
      due_date: due_date ? new Date(due_date) : undefined,
      start_date: start_date ? new Date(start_date) : undefined,
      
      // Handle other dropdown fields
      deadline_type: deadline_type && typeof deadline_type === 'string' ? deadline_type.trim() : undefined,
      financial_return_value_speed: financial_return_value_speed && typeof financial_return_value_speed === 'string' 
        ? financial_return_value_speed.trim() : undefined,
      
      // Handle parent task fields
      parent_task: parent_task && typeof parent_task === 'string' ? parent_task.trim() : undefined,
      parent_task_id: parent_task_id && typeof parent_task_id === 'string' ? parent_task_id.trim() : undefined,
      
      // Handle enhanced form fields
      financial_aspect: financial_aspect && typeof financial_aspect === 'string' ? financial_aspect.trim() : "Žiadny",
      suggested_initial_steps_subtasks: suggested_initial_steps_subtasks && typeof suggested_initial_steps_subtasks === 'string' 
        ? suggested_initial_steps_subtasks.trim() : undefined,
      related_areas_for_ai_to_consider: related_areas_for_ai_to_consider && typeof related_areas_for_ai_to_consider === 'string'
        ? related_areas_for_ai_to_consider.trim() : undefined,
      potential_dependencies_related_tasks: potential_dependencies_related_tasks && typeof potential_dependencies_related_tasks === 'string'
        ? potential_dependencies_related_tasks.trim() : undefined,
      
      // Additional fields from the enhanced form - corrected field names to match schema
      related_entities: related_entity && typeof related_entity === 'string' 
        ? [related_entity.trim()] 
        : (Array.isArray(related_entity) ? related_entity : []),
      desired_output_format: Array.isArray(desired_output_format) 
        ? desired_output_format 
        : (desired_output_format ? [desired_output_format.trim()] : []),
      ai_action_process_free_text: ai_action_process_free_text && typeof ai_action_process_free_text === 'string'
        ? ai_action_process_free_text.trim() : undefined,
      ai_action_process_dropdown: Array.isArray(ai_action_process_dropdown)
        ? ai_action_process_dropdown
        : (ai_action_process_dropdown && typeof ai_action_process_dropdown === 'string' 
          ? [ai_action_process_dropdown.trim()] : []),
      specific_constraints_instructions: specific_constraints_instructions && typeof specific_constraints_instructions === 'string'
        ? specific_constraints_instructions.trim() : undefined,
      ai_behavior_on_uncertainty: ai_behavior_on_uncertainty && typeof ai_behavior_on_uncertainty === 'string'
        ? ai_behavior_on_uncertainty.trim() : undefined,
      
      // System fields with defaults
      created_at: new Date(),
      ai_workflow_status: ai_workflow_status || "1 - Nová (v Inboxe)", // Use provided value or default
      allow_autonomous_execution: allow_autonomous_execution || "Len Kategorizuj a Generuj Kroky/Plán", // Use provided value or default
    };

    // --- Create Task in Database ---
    console.log("Attempting to create task with data:", taskData);
    
    // Get the next sequential task ID
    const nextTaskId = await getNextTaskId();
    taskData.task_id = nextTaskId;
    
    console.log(`Assigned task_id: ${nextTaskId}`);
    
    const newTask = await prisma.task.create({
      // Explicitly cast taskData to the correct type expected by Prisma,
      // ensuring only valid fields are included.
      data: taskData as any, // Use 'as any' cautiously or define a stricter type for creation data
    });
    console.log("Task created successfully:", newTask);

    // --- Placeholder for AI Trigger (Future Step) ---
    // TODO: After successful creation, enqueue or trigger an async job
    //       to perform AI auto-categorization and enrichment for `newTask.id`.
    //       Example: await triggerAIProcessing(newTask.id);

    // --- Return Success Response ---
    // Return the full newly created task object
    return NextResponse.json(newTask, { status: 201 });

  } catch (error: any) {
    console.error("API Error: Failed to create task:", error);

    // Handle potential Prisma-specific errors (e.g., unique constraint violation)
    if (error.code === 'P2002') { // Example: Prisma code for unique constraint violation
        return NextResponse.json({ error: `Unique constraint violation: ${error.meta?.target}` }, { status: 409 });
    }
    // Handle validation errors more gracefully if you implement a validation library
    if (error.name === 'ValidationError') {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Generic server error for other cases
    return NextResponse.json(
      { error: 'Internal Server Error: Could not create task.' },
      { status: 500 }
    );
  }
}

// Note: You would add PUT/PATCH and DELETE handlers here as needed later.