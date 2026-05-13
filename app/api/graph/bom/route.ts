import { NextRequest, NextResponse } from 'next/server';
import { getGraphDatabase } from '@/lib/kuzu-graph';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const assemblyId = searchParams.get('assemblyId');
  const graph = getGraphDatabase();

  if (!assemblyId) {
    return NextResponse.json({ error: 'Assembly ID required' }, { status: 400 });
  }

  try {
    // Get the BOM for this assembly
    const bom = graph.getAssemblyBOM(assemblyId);
    
    return NextResponse.json({
      assembly: bom.assembly,
      parts: bom.parts,
    });
  } catch (error) {
    console.error('BOM API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
