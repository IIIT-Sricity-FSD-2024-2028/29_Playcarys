import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthContext from '../../context/AuthContext';
import publisherService from '../../services/publisherService';
import StepRail from '../../components/publisher/publish/StepRail';
import HostingModeStep from '../../components/publisher/publish/HostingModeStep';
import BasicInfoStep from '../../components/publisher/publish/BasicInfoStep';
import GameDetailsStep from '../../components/publisher/publish/GameDetailsStep';
import ReviewSubmitStep from '../../components/publisher/publish/ReviewSubmitStep';
import Toast from '../../components/common/Toast';
import LoadingState from '../../components/common/LoadingState';
import '../../styles/publisher/publish.css';

export function PublishGame() {
  const { user, loading: authLoading } = useContext(AuthContext);
  const navigate = useNavigate();

  // Wizard step: 0 to 3
  const [currentStep, setCurrentStep] = useState(0);

  // Step 0: Hosting Mode
  const [hostingMode, setHostingMode] = useState('');

  // Step 1: Basic Info
  const [title, setTitle] = useState('');
  const [titleError, setTitleError] = useState('');
  const [description, setDescription] = useState('');
  const [descriptionError, setDescriptionError] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('');
  const [genreError, setGenreError] = useState('');
  const [genres, setGenres] = useState([]);

  // Step 2: Game Details
  const [minPlayers, setMinPlayers] = useState('');
  const [minError, setMinError] = useState('');
  const [maxPlayers, setMaxPlayers] = useState('');
  const [maxError, setMaxError] = useState('');
  const [gameMode, setGameMode] = useState('Multiplayer');
  const [ageRating, setAgeRating] = useState('Mature');
  const [tournamentFormat, setTournamentFormat] = useState('0');
  const [thumbnailDataUrl, setThumbnailDataUrl] = useState('');
  const [thumbError, setThumbError] = useState('');
  const [maxCarys, setMaxCarys] = useState(200);
  const [maxCarysError, setMaxCarysError] = useState('');
  const [achievements, setAchievements] = useState([]);

  // Step 2: Hosted extra
  const [zipFile, setZipFile] = useState(null);
  const [zipFileName, setZipFileName] = useState('');
  const [isZipValid, setIsZipValid] = useState(false);
  const [zipError, setZipError] = useState('');

  // Step 2: Self-hosted extra
  const [gameUrl, setGameUrl] = useState('');
  const [gameUrlError, setGameUrlError] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [apiKey, setApiKey] = useState('');

  // Toast feedback
  const [toast, setToast] = useState({ message: '', type: 'info' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize genres and API key
  useEffect(() => {
    const list = publisherService.getGenres();
    setGenres(list);

    const randomKey = 'pk_live_' + Math.random().toString(36).substring(2, 22).toUpperCase();
    setApiKey(randomKey);
  }, []);

  function showToast(message, type = 'info') {
    setToast({ message, type });
  }

  function handleCopyApiKey() {
    if (apiKey) {
      navigator.clipboard?.writeText(apiKey).catch(() => {});
      showToast('API key copied to clipboard!', 'success');
    }
  }

  // Achievement editor actions
  function handleAddAchievement() {
    setAchievements((prev) => [
      ...prev,
      {
        id: Date.now() + Math.random(),
        code: '',
        name: '',
        icon: '🏆',
        description: '',
        carys_reward: 25,
        title_awarded: '',
        secret: false
      }
    ]);
  }

  function handleUpdateAchievement(index, field, value) {
    setAchievements((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  }

  function handleRemoveAchievement(index) {
    setAchievements((prev) => prev.filter((_, i) => i !== index));
  }

  // Validate step navigation
  function handleNextStep(step) {
    if (step === 0) {
      if (!hostingMode) {
        showToast('Please select a hosting option first', 'warning');
        return;
      }
      setCurrentStep(1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (step === 1) {
      let valid = true;
      const t = title.trim();
      const d = description.trim();

      if (!t) {
        setTitleError('Game title is required');
        valid = false;
      } else if (t.length < 3) {
        setTitleError('Min 3 characters');
        valid = false;
      } else if (t.length > 60) {
        setTitleError('Max 60 characters');
        valid = false;
      } else {
        setTitleError('');
      }

      if (!d) {
        setDescriptionError('Description is required');
        valid = false;
      } else if (d.length < 20) {
        setDescriptionError('Min 20 characters');
        valid = false;
      } else if (d.length > 500) {
        setDescriptionError('Max 500 characters');
        valid = false;
      } else {
        setDescriptionError('');
      }

      if (!selectedGenre) {
        setGenreError('Please select a genre');
        valid = false;
      } else {
        setGenreError('');
      }

      if (!valid) return;
      setCurrentStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (step === 2) {
      let valid = true;
      const minNum = parseInt(minPlayers, 10);
      const maxNum = parseInt(maxPlayers, 10);

      if (isNaN(minNum) || minNum < 1 || minNum > 100) {
        setMinError('1–100 players required');
        valid = false;
      } else {
        setMinError('');
      }

      if (isNaN(maxNum) || maxNum < 1 || maxNum > 1000) {
        setMaxError('1–1000 players required');
        valid = false;
      } else {
        setMaxError('');
      }

      if (!isNaN(minNum) && !isNaN(maxNum) && minNum > maxNum) {
        setMaxError('Max must be ≥ min');
        valid = false;
      }

      const carysNum = parseInt(maxCarys, 10);
      if (isNaN(carysNum) || carysNum < 0 || carysNum > 1000) {
        setMaxCarysError('0–1000 Carys per match required');
        valid = false;
      } else {
        setMaxCarysError('');
      }

      if (hostingMode === 'selfhosted') {
        if (!gameUrl.trim()) {
          setGameUrlError('Game URL is required for self-hosted games');
          showToast('Game URL is required for self-hosted games', 'warning');
          valid = false;
        } else {
          setGameUrlError('');
        }
      } else if (hostingMode === 'hosted') {
        if (!zipFile || !isZipValid) {
          setZipError('Please upload your game assets (.zip) before submitting.');
          valid = false;
        } else {
          setZipError('');
        }
      }

      if (!thumbnailDataUrl) {
        setThumbError('Please upload a game thumbnail before continuing.');
        valid = false;
      } else {
        setThumbError('');
      }

      // Validate achievements
      const seen = new Set();
      for (const ach of achievements) {
        const code = (ach.code || '').trim().toLowerCase();
        const name = (ach.name || '').trim();
        if (!code && !name) continue; // blank row ignored

        if (!/^[a-z0-9][a-z0-9_-]*$/.test(code)) {
          showToast(`Achievement code "${code || '(blank)'}" must be lowercase letters, numbers, _ or -`, 'error');
          valid = false;
          break;
        }
        if (!name) {
          showToast(`Achievement "${code}" needs a name.`, 'error');
          valid = false;
          break;
        }
        if (seen.has(code)) {
          showToast(`Duplicate achievement code: ${code}`, 'error');
          valid = false;
          break;
        }
        seen.add(code);
      }

      if (!valid) return;
      setCurrentStep(3);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
  }

  function handlePrevStep(step) {
    setCurrentStep((prev) => Math.max(0, prev - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleSubmitGame() {
    if (isSubmitting) return;

    const trimmedTitle = title.trim();
    if (publisherService.checkTitleExists(trimmedTitle)) {
      showToast('A game with this title already exists.', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      const pubUserId = parseInt(user?.userId || user?.id || 1, 10);
      const newGameId = publisherService.getNextGameId();
      const maxCarysNum = Math.max(0, Math.min(1000, parseInt(maxCarys, 10) || 0));

      const newGame = {
        game_id: newGameId,
        game_name: trimmedTitle,
        desc: description.trim(),
        game_type: selectedGenre,
        players: `${minPlayers}-${maxPlayers}`,
        tournamentFormat: parseInt(tournamentFormat, 10),
        game_publisher: pubUserId,
        game_approval_status: 'pending',
        game_status: 'disabled',
        hostingType: hostingMode,
        hosting_type: hostingMode,
        gameUrl: hostingMode === 'selfhosted' ? gameUrl.trim() : null,
        game_url: hostingMode === 'selfhosted' ? gameUrl.trim() : null,
        webhookUrl: hostingMode === 'selfhosted' ? webhookUrl.trim() : null,
        webhook_url: hostingMode === 'selfhosted' ? webhookUrl.trim() : null,
        img: thumbnailDataUrl,
        max_carys_per_match: maxCarysNum,
        sessions: 0,
        rating: 0,
        views: 0,
        submittedDate: new Date().toISOString().slice(0, 10)
      };

      // 1. Save listing record
      await publisherService.saveGameRecord(newGame, user);

      // 2. Upload bundle if hosted
      if (hostingMode === 'hosted' && zipFile) {
        showToast('Uploading game build… this can take a moment.', 'info');
        try {
          const uploaded = await publisherService.uploadBundle(newGameId, pubUserId, zipFile);
          if (uploaded && uploaded.play_path) {
            await publisherService.updateGamePlayPath(newGameId, uploaded.play_path);
          }
        } catch (uploadErr) {
          showToast(
            'Game listed, but the build upload failed. You can re-upload it from My Games.',
            'warning'
          );
          setTimeout(() => {
            window.location.href = '/pages/publisher/mygames.html';
          }, 2200);
          return;
        }
      }

      // 3. Submit achievements if defined
      const validAchievements = achievements
        .filter((a) => a.code && a.name)
        .map((a) => ({
          code: a.code.trim().toLowerCase(),
          name: a.name.trim(),
          description: a.description?.trim() || '',
          icon: a.icon || '🏆',
          carys_reward: Math.max(0, Math.min(500, parseInt(a.carys_reward, 10) || 0)),
          title_awarded: a.title_awarded?.trim() || undefined,
          secret: !!a.secret
        }));

      if (validAchievements.length > 0) {
        const achRes = await publisherService.submitAchievements(
          newGameId,
          pubUserId,
          validAchievements
        );
        if (achRes.failed.length > 0) {
          showToast(
            `Game submitted, but ${achRes.failed.length} achievement(s) were rejected: ${achRes.failed[0]}`,
            'warning'
          );
        } else {
          showToast(`Game submitted with ${achRes.created} achievement(s)! 🎮`, 'success');
          setTimeout(() => {
            window.location.href = '/pages/publisher/mygames.html';
          }, 1400);
          return;
        }
      }

      showToast('Game submitted for review! 🎮', 'success');
      setTimeout(() => {
        window.location.href = '/pages/publisher/mygames.html';
      }, 1200);
    } catch (err) {
      console.error('Failed to submit game:', err);
      showToast(err.message || 'Failed to submit game for review', 'error');
      setIsSubmitting(false);
    }
  }

  if (authLoading) {
    return <LoadingState message="Loading Publisher Studio…" />;
  }

  if (!authLoading && (!user || user.role !== 'publisher')) {
    return (
      <div className="page-content" style={{ textAlign: 'center', padding: '5rem 1rem' }}>
        <h2>Publisher Access Required</h2>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
          Please sign in with a publisher account to access this studio page.
        </p>
        <button
          className="btn btn-primary"
          style={{ marginTop: '1.5rem' }}
          onClick={() => {
            window.location.href = '/index.html';
          }}
        >
          Go to Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="page-content">
      <div className="publish-shell">
        {/* Header */}
        <div className="pub-header">
          <h1>Publish Your Game</h1>
          <p>List your game on PlayCarys and reach thousands of players</p>
        </div>

        {/* Step Rail */}
        <StepRail currentStep={currentStep} />

        {/* Wizard Steps */}
        {currentStep === 0 && (
          <HostingModeStep
            hostingMode={hostingMode}
            onSelectHosting={(mode) => setHostingMode(mode)}
            onNext={() => handleNextStep(0)}
          />
        )}

        {currentStep === 1 && (
          <BasicInfoStep
            title={title}
            onChangeTitle={(val) => {
              setTitle(val);
              if (titleError) setTitleError('');
            }}
            titleError={titleError}
            description={description}
            onChangeDescription={(val) => {
              setDescription(val);
              if (descriptionError) setDescriptionError('');
            }}
            descriptionError={descriptionError}
            genres={genres}
            selectedGenre={selectedGenre}
            onSelectGenre={(g) => {
              setSelectedGenre(g);
              if (genreError) setGenreError('');
            }}
            genreError={genreError}
            onBack={() => handlePrevStep(1)}
            onNext={() => handleNextStep(1)}
          />
        )}

        {currentStep === 2 && (
          <GameDetailsStep
            minPlayers={minPlayers}
            onChangeMinPlayers={(val) => {
              setMinPlayers(val);
              if (minError) setMinError('');
            }}
            minError={minError}
            maxPlayers={maxPlayers}
            onChangeMaxPlayers={(val) => {
              setMaxPlayers(val);
              if (maxError) setMaxError('');
            }}
            maxError={maxError}
            gameMode={gameMode}
            onChangeGameMode={setGameMode}
            ageRating={ageRating}
            onChangeAgeRating={setAgeRating}
            tournamentFormat={tournamentFormat}
            onChangeTournamentFormat={setTournamentFormat}
            thumbnailDataUrl={thumbnailDataUrl}
            onThumbnailSelected={(dataUrl) => {
              setThumbnailDataUrl(dataUrl);
              if (thumbError) setThumbError('');
            }}
            thumbError={thumbError}
            maxCarys={maxCarys}
            onChangeMaxCarys={(val) => {
              setMaxCarys(val);
              if (maxCarysError) setMaxCarysError('');
            }}
            maxCarysError={maxCarysError}
            achievements={achievements}
            onAddAchievement={handleAddAchievement}
            onUpdateAchievement={handleUpdateAchievement}
            onRemoveAchievement={handleRemoveAchievement}
            hostingMode={hostingMode}
            zipFile={zipFile}
            zipFileName={zipFileName}
            isZipValid={isZipValid}
            zipError={zipError}
            onZipValidated={(file, name, valid, err) => {
              setZipFile(file);
              setZipFileName(name);
              setIsZipValid(valid);
              setZipError(err);
            }}
            gameUrl={gameUrl}
            onChangeGameUrl={(val) => {
              setGameUrl(val);
              if (gameUrlError) setGameUrlError('');
            }}
            gameUrlError={gameUrlError}
            webhookUrl={webhookUrl}
            onChangeWebhookUrl={setWebhookUrl}
            apiKey={apiKey}
            onCopyApiKey={handleCopyApiKey}
            onBack={() => handlePrevStep(2)}
            onNext={() => handleNextStep(2)}
          />
        )}

        {currentStep === 3 && (
          <ReviewSubmitStep
            title={title}
            description={description}
            selectedGenre={selectedGenre}
            minPlayers={minPlayers}
            maxPlayers={maxPlayers}
            gameMode={gameMode}
            ageRating={ageRating}
            tournamentFormat={tournamentFormat}
            maxCarys={maxCarys}
            achievements={achievements}
            hostingMode={hostingMode}
            gameUrl={gameUrl}
            thumbnailDataUrl={thumbnailDataUrl}
            isSubmitting={isSubmitting}
            onBack={() => handlePrevStep(3)}
            onSubmit={handleSubmitGame}
          />
        )}
      </div>

      {toast.message && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ message: '', type: 'info' })}
        />
      )}
    </div>
  );
}

export default PublishGame;
