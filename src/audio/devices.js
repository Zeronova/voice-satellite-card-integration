/**
 * Audio device diagnostics.
 *
 * Browser device labels are only reliably populated after microphone
 * permission has been granted, so callers should run this after getUserMedia().
 */

export function describeSelectedAudioTrack(track) {
  if (!track) return 'Selected mic: none';
  const settings = track.getSettings?.() || {};
  const label = track.label ? ` "${track.label}"` : '';
  const bits = [
    `Selected mic:${label}`,
    `device=${shortDeviceId(settings.deviceId)}`,
    `group=${shortDeviceId(settings.groupId)}`,
    `state=${track.readyState || 'unknown'}`,
    `enabled=${track.enabled}`,
    `muted=${track.muted}`,
  ];
  if (settings.sampleRate) bits.push(`rate=${settings.sampleRate}Hz`);
  if (settings.channelCount) bits.push(`ch=${settings.channelCount}`);
  return bits.join(' ');
}

export async function describeAudioInputDevices(selectedTrack) {
  if (!navigator.mediaDevices?.enumerateDevices) {
    return 'Available mics: enumerateDevices unavailable';
  }

  const selectedSettings = selectedTrack?.getSettings?.() || {};
  const selectedLabel = selectedTrack?.label || '';

  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const inputs = devices.filter((d) => d.kind === 'audioinput');
    if (inputs.length === 0) return 'Available mics: none visible to browser';

    const lines = inputs.map((device, idx) => {
      const selected = isSelectedInput(device, selectedSettings, selectedLabel);
      const label = device.label || '(label unavailable)';
      const flags = [];
      if (selected) flags.push('selected');
      if (device.deviceId === 'default') flags.push('browser-default');
      if (device.deviceId === 'communications') flags.push('communications');
      const suffix = flags.length ? ` [${flags.join(', ')}]` : '';
      return `${idx + 1}. "${label}" id=${shortDeviceId(device.deviceId)} group=${shortDeviceId(device.groupId)}${suffix}`;
    });
    return `Available mics: ${lines.join('; ')}`;
  } catch (err) {
    return `Available mics: enumerateDevices failed: ${err?.message || err}`;
  }
}

export async function getAudioInputDeviceOptions() {
  const fallback = [{ value: 'default', label: 'Browser default microphone' }];
  if (!navigator.mediaDevices?.enumerateDevices) return fallback;

  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const inputs = devices.filter((d) => d.kind === 'audioinput');
    if (inputs.length === 0) {
      return [{ value: 'default', label: 'Browser default microphone (no microphones found)' }];
    }

    const options = [];
    const defaultDevice = inputs.find((d) => d.deviceId === 'default');
    options.push({
      value: 'default',
      label: defaultDevice?.label
        ? `Browser default - ${defaultDevice.label}`
        : 'Browser default microphone',
    });

    for (const device of inputs) {
      if (!device.deviceId || device.deviceId === 'default' || device.deviceId === 'communications') continue;
      options.push({
        value: device.deviceId,
        label: device.label || `Microphone ${options.length}`,
      });
    }
    return options;
  } catch (_) {
    return fallback;
  }
}

function isSelectedInput(device, selectedSettings, selectedLabel) {
  if (!device) return false;
  if (selectedSettings.deviceId && device.deviceId === selectedSettings.deviceId) return true;
  if (
    selectedSettings.groupId
    && device.groupId === selectedSettings.groupId
    && (!selectedLabel || !device.label || device.label === selectedLabel)
  ) {
    return true;
  }
  if (selectedLabel && device.label === selectedLabel) return true;
  return false;
}

function shortDeviceId(id) {
  if (!id) return '?';
  if (id === 'default' || id === 'communications') return id;
  return id.length <= 12 ? id : `${id.slice(0, 8)}...`;
}
