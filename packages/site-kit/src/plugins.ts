import type { ImageMetadata } from 'astro';
import begoneIcon from '@browser-plugins/assets/plugins/begone.png';
import cookiejarIcon from '@browser-plugins/assets/plugins/cookiejar.png';
import focacciaIcon from '@browser-plugins/assets/plugins/focaccia.png';
import headerforgeIcon from '@browser-plugins/assets/plugins/headerforge.png';
import hopchaseIcon from '@browser-plugins/assets/plugins/hopchase.png';
import { pluginData, type PluginData, type PluginSlug } from './plugin-data';

export { SITE, homeCard, pluginData } from './plugin-data';
export type { PluginData, PluginSlug };

export interface PluginMeta extends PluginData {
  /** 48px icon from @browser-plugins/assets (shared, hashed at build). */
  icon: ImageMetadata;
}

const icons: Record<PluginSlug, ImageMetadata> = {
  begone: begoneIcon,
  cookiejar: cookiejarIcon,
  focaccia: focacciaIcon,
  headerforge: headerforgeIcon,
  hopchase: hopchaseIcon,
};

export const plugins: PluginMeta[] = pluginData.map((p) => ({ ...p, icon: icons[p.slug] }));
