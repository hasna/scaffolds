/**
 * Data Specialist Agent
 * Handles data processing, analysis, and transformation
 */

import { BaseSpecialist } from "./base-specialist.js";
import type { AgentResult } from "../../core/types.js";

const DATA_SPECIALIST_PROMPT = `You are a Data Specialist Agent focused on data processing and analysis.

## Your Capabilities

1. **Data Analysis**: Analyze datasets, find patterns
2. **Data Transformation**: Clean, transform, reshape data
3. **Data Validation**: Check data quality and integrity
4. **Statistics**: Calculate metrics and statistics
5. **Visualization**: Suggest and create data visualizations

## Available Tools

- Read: Read data files (JSON, CSV, etc.)
- Write: Write processed data
- Bash: Run data processing scripts
- Glob: Find data files
- Grep: Search data content

## Guidelines

1. Validate data before processing
2. Handle missing and invalid values
3. Preserve data types appropriately
4. Document transformations applied
5. Report any data quality issues

## Output Format

For data analysis:
1. **Overview**: Dataset description
2. **Statistics**: Key metrics
3. **Patterns**: Notable patterns found
4. **Issues**: Data quality concerns
5. **Recommendations**: Suggested actions

For transformations:
1. **Input**: Original data format
2. **Output**: Transformed data format
3. **Steps**: Transformation steps applied
4. **Validation**: Quality checks performed
`;

export class DataSpecialist extends BaseSpecialist {
  constructor() {
    super({
      domain: "data",
      tools: ["Read", "Write", "Bash", "Glob", "Grep"],
      systemPrompt: DATA_SPECIALIST_PROMPT,
    });
  }

  /**
   * Analyze data
   */
  async analyze(dataSource: string): Promise<AgentResult> {
    return this.execute(`Analyze the data at ${dataSource}.

Provide:
1. Data structure overview
2. Basic statistics (count, types, missing values)
3. Key patterns and distributions
4. Data quality assessment
5. Suggested analyses or visualizations`);
  }

  /**
   * Transform data
   */
  async transform(
    source: string,
    transformation: string,
    output?: string
  ): Promise<AgentResult> {
    return this.execute(`Transform data from ${source}.

Transformation: ${transformation}
${output ? `Output to: ${output}` : ""}

Steps:
1. Read and validate input data
2. Apply transformation
3. Validate output data
4. Write results
5. Report any issues`);
  }

  /**
   * Validate data
   */
  async validate(dataSource: string, schema?: string): Promise<AgentResult> {
    const schemaInfo = schema
      ? `\nExpected schema:\n${schema}`
      : "";

    return this.execute(`Validate the data at ${dataSource}.${schemaInfo}

Check for:
1. Data type consistency
2. Missing or null values
3. Duplicate records
4. Value range validity
5. Referential integrity

Report all issues found with specific records.`);
  }

  /**
   * Generate statistics
   */
  async statistics(dataSource: string, fields?: string[]): Promise<AgentResult> {
    const fieldsInfo = fields
      ? `\nFocus on fields: ${fields.join(", ")}`
      : "";

    return this.execute(`Generate statistics for ${dataSource}.${fieldsInfo}

Include:
1. Count and distinct values
2. Mean, median, mode
3. Min, max, range
4. Standard deviation
5. Distribution summary`);
  }

  /**
   * Convert data format
   */
  async convert(
    source: string,
    fromFormat: string,
    toFormat: string,
    output: string
  ): Promise<AgentResult> {
    return this.execute(`Convert ${source} from ${fromFormat} to ${toFormat}.
Output to: ${output}

Ensure:
1. All data is preserved
2. Data types are maintained
3. Encoding is correct
4. Output is valid ${toFormat}`);
  }
}
