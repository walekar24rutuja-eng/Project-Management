const PROGRESS_TEMPLATE_VERSION = 1;

const PROGRESS_TEMPLATE = [
  {
    key: 'topic_confirmation',
    name: 'Topic Confirmation',
    description: 'Establish the project topic, problem, and objectives.',
    milestones: [
      ['topic_finalized', 'Project topic finalized', 'Finalize a clear project topic.'],
      ['problem_statement', 'Problem statement prepared', 'Describe the problem addressed by the project.'],
      ['objectives_scope', 'Objectives and scope defined', 'Document project objectives and boundaries.'],
      ['mentor_topic_approval', 'Topic reviewed with mentor', 'Discuss and confirm the project direction with the mentor.']
    ]
  },
  {
    key: 'research_analysis',
    name: 'Research and Analysis',
    description: 'Understand the problem domain, prior work, users, and requirements.',
    milestones: [
      ['literature_survey', 'Literature survey completed', 'Summarize relevant research and prior work.'],
      ['existing_system_analysis', 'Existing systems analyzed', 'Compare current approaches and their limitations.'],
      ['requirement_analysis', 'Requirements identified', 'Document functional and non-functional requirements.'],
      ['feasibility_analysis', 'Feasibility analysis completed', 'Assess technical, operational, and practical feasibility.']
    ]
  },
  {
    key: 'planning_design',
    name: 'Planning and Design',
    description: 'Decide how the project will be structured and implemented.',
    milestones: [
      ['technology_selection', 'Technology stack finalized', 'Record the selected tools, languages, and platforms.'],
      ['system_architecture', 'System architecture designed', 'Describe the architecture and component interactions.'],
      ['database_design', 'Data model designed', 'Document the data model and relationships where applicable.'],
      ['ui_or_prototype', 'Interface or prototype prepared', 'Prepare a prototype, experiment plan, or equivalent design artefact.']
    ]
  },
  {
    key: 'development_implementation',
    name: 'Development and Implementation',
    description: 'Build the core project solution.',
    milestones: [
      ['core_module_1', 'Core functionality implemented', 'Implement the first major project capability.'],
      ['core_module_2', 'Supporting functionality implemented', 'Implement an additional major project capability.'],
      ['integration', 'Components integrated', 'Integrate the major project components.'],
      ['implementation_review', 'Implementation reviewed', 'Demonstrate the working implementation to the mentor.']
    ]
  },
  {
    key: 'testing_validation',
    name: 'Testing and Validation',
    description: 'Verify that the solution works and meets its requirements.',
    milestones: [
      ['test_plan', 'Test plan prepared', 'Document test cases or validation criteria.'],
      ['functional_testing', 'Functional testing completed', 'Test the main features or experiments.'],
      ['issue_resolution', 'Identified issues addressed', 'Correct important defects or failed cases.'],
      ['validation_results', 'Results validated', 'Review results against the project objectives.']
    ]
  },
  {
    key: 'report_documentation',
    name: 'Report and Documentation',
    description: 'Prepare the academic report and supporting documentation.',
    milestones: [
      ['report_draft', 'Report draft prepared', 'Prepare an initial report covering the project work.'],
      ['technical_documentation', 'Technical documentation completed', 'Complete relevant design, implementation, and usage documentation.'],
      ['results_documentation', 'Results and findings documented', 'Record outputs, evaluation, and findings.'],
      ['final_report', 'Final report prepared', 'Prepare the complete report for mentor review.']
    ]
  },
  {
    key: 'final_review_submission',
    name: 'Final Review and Submission',
    description: 'Complete the final demonstration, review, and submission.',
    milestones: [
      ['final_demo', 'Final demonstration prepared', 'Prepare a working demonstration of the project.'],
      ['presentation', 'Final presentation prepared', 'Prepare slides and presentation material.'],
      ['mentor_final_review', 'Final mentor review completed', 'Address final mentor feedback and corrections.'],
      ['final_submission', 'Project submitted', 'Submit the required final project artefacts.']
    ]
  }
].map((phase, phaseIndex) => ({
  key: phase.key,
  name: phase.name,
  description: phase.description,
  order: phaseIndex + 1,
  milestones: phase.milestones.map(([key, title, description], index) => ({
    key,
    title,
    description,
    order: index + 1
  }))
}));

module.exports = {
  PROGRESS_TEMPLATE,
  PROGRESS_TEMPLATE_VERSION
};
