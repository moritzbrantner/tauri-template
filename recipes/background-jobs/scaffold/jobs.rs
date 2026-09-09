#[derive(Clone, Debug, PartialEq)]
pub enum JobState {
    Queued,
    Running { progress: f32 },
    Completed,
    Cancelled,
    Failed { message: String },
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum JobTransitionError {
    InvalidTransition,
    InvalidProgress,
    ProgressRegressed,
    EmptyFailureMessage,
}

impl JobState {
    pub fn start(&self) -> Result<Self, JobTransitionError> {
        match self {
            Self::Queued => Ok(Self::Running { progress: 0.0 }),
            _ => Err(JobTransitionError::InvalidTransition),
        }
    }

    pub fn with_progress(&self, next: f32) -> Result<Self, JobTransitionError> {
        let Self::Running { progress: current } = self else {
            return Err(JobTransitionError::InvalidTransition);
        };
        if !next.is_finite() || !(0.0..=1.0).contains(&next) {
            return Err(JobTransitionError::InvalidProgress);
        }
        if next < *current {
            return Err(JobTransitionError::ProgressRegressed);
        }
        Ok(Self::Running { progress: next })
    }

    pub fn complete(&self) -> Result<Self, JobTransitionError> {
        match self {
            Self::Running { .. } => Ok(Self::Completed),
            _ => Err(JobTransitionError::InvalidTransition),
        }
    }

    pub fn cancel(&self) -> Result<Self, JobTransitionError> {
        match self {
            Self::Queued | Self::Running { .. } => Ok(Self::Cancelled),
            Self::Cancelled => Ok(Self::Cancelled),
            Self::Completed | Self::Failed { .. } => Err(JobTransitionError::InvalidTransition),
        }
    }

    pub fn fail(&self, message: impl Into<String>) -> Result<Self, JobTransitionError> {
        match self {
            Self::Queued | Self::Running { .. } => {
                let message = message.into();
                if message.trim().is_empty() {
                    return Err(JobTransitionError::EmptyFailureMessage);
                }
                Ok(Self::Failed { message })
            }
            _ => Err(JobTransitionError::InvalidTransition),
        }
    }

    pub fn is_terminal(&self) -> bool {
        matches!(self, Self::Completed | Self::Cancelled | Self::Failed { .. })
    }
}

#[cfg(test)]
mod tests {
    use super::{JobState, JobTransitionError};

    #[test]
    fn progress_is_monotonic_and_bounded() {
        let running = JobState::Queued.start().expect("queued jobs should start");
        let halfway = running.with_progress(0.5).expect("valid progress should advance");

        assert_eq!(halfway.with_progress(0.4), Err(JobTransitionError::ProgressRegressed));
        assert_eq!(halfway.with_progress(1.1), Err(JobTransitionError::InvalidProgress));
        assert_eq!(halfway.with_progress(f32::NAN), Err(JobTransitionError::InvalidProgress));
    }

    #[test]
    fn cancellation_is_idempotent_before_terminal_completion() {
        let cancelled = JobState::Queued.cancel().expect("queued jobs should cancel");
        assert_eq!(cancelled.cancel(), Ok(JobState::Cancelled));
        assert!(cancelled.is_terminal());
    }

    #[test]
    fn terminal_states_do_not_reopen() {
        let completed = JobState::Queued
            .start()
            .and_then(|state| state.complete())
            .expect("running jobs should complete");

        assert_eq!(completed.cancel(), Err(JobTransitionError::InvalidTransition));
        assert_eq!(completed.start(), Err(JobTransitionError::InvalidTransition));
    }
}
