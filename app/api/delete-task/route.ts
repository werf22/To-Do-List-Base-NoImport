// /app/api/delete-task/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  console.log("DELETE TASK API CALLED");
  
  try {
    // Parse the request body
    const body = await request.json();
    console.log("Request body:", body);
    
    const { taskId } = body;
    
    if (!taskId) {
      console.error("No taskId provided");
      return NextResponse.json({ success: false, error: "Task ID is required" }, { status: 400 });
    }
    
    console.log(`Attempting to delete task with ID: ${taskId}`);
    
    // Delete the task
    const deletedTask = await prisma.task.delete({
      where: { id: taskId }
    });
    
    console.log("Task deleted successfully:", deletedTask);
    
    return NextResponse.json({ success: true, message: "Task deleted successfully" });
  } catch (error) {
    console.error("Error deleting task:", error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : "An unknown error occurred" 
    }, { status: 500 });
  }
}
